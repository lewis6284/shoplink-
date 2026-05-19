require('dotenv').config();
require('./config/db'); // Preload all models so associations are registered

const app = require('./app');
const { connectDB } = require('./config/database');
const { initializeDailyReportScheduler } = require('./utils/reportScheduler');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to Database
    await connectDB();
    console.log('✅ Database connected successfully.');

    // Start Listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });

    if (process.env.DISABLE_REPORT_SCHEDULER !== 'true') {
      initializeDailyReportScheduler().catch(error => {
        console.error('❌ Failed to initialize report scheduler:', error);
      });
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
