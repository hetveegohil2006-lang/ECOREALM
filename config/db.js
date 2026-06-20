const mongoose = require('mongoose');
const { execSync } = require('child_process');
const mockMongoose = require('./mongooseMock');

let useMock = false;

if (!process.env.MONGO_URI) {
  useMock = true;
} else {
  try {
    const checkScript = `
      const net = require('net');
      const dns = require('dns');
      let host = '127.0.0.1';
      let port = 27017;
      const uri = process.env.MONGO_URI || '';
      const isSrv = uri.startsWith('mongodb+srv://');
      if (uri.startsWith('mongodb://') || isSrv) {
        const cleanUri = uri.replace('mongodb+srv://', 'mongodb://');
        try {
          const parsed = new URL(cleanUri);
          host = parsed.hostname || '127.0.0.1';
          port = parsed.port ? parseInt(parsed.port) : 27017;
        } catch (e) {}
      }
      if (isSrv) {
        dns.lookup(host, (err) => {
          if (err) process.exit(1);
          else process.exit(0);
        });
      } else {
        const client = net.createConnection({ port, host, timeout: 800 }, () => {
          client.end();
          process.exit(0);
        });
        client.on('error', () => {
          process.exit(1);
        });
        client.setTimeout(800, () => {
          client.destroy();
          process.exit(1);
        });
      }
    `;

    execSync(`node -e "${checkScript.replace(/\n/g, ' ')}"`, {
      env: { MONGO_URI: process.env.MONGO_URI },
      stdio: 'ignore',
      timeout: 1200
    });
  } catch (err) {
    useMock = true;
  }
}

if (useMock) {
  console.log('⚠️  MongoDB is offline or unreachable. Initializing in-memory mock fallback mode.');
  require.cache[require.resolve('mongoose')].exports = mockMongoose;
}

const connectDB = async () => {
  if (useMock) {
    await mockMongoose.connect();
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    console.warn('⚠️  Server will continue running in fallback mode.');
  }
};

module.exports = connectDB;
