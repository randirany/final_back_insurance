/**
 * Migration: Drop unique index on vehicles.plateNumber
 *
 * This migration removes the unique constraint on the vehicles.plateNumber field
 * as multiple customers can have vehicles with the same plate number over time.
 *
 * Run this migration once before starting the application.
 *
 * Usage:
 *   node migrations/001_drop_vehicle_plate_unique_index.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const dropVehiclePlateNumberIndex = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DBURL);
    console.log('✓ Connected to MongoDB');

    // Drop the unique index if it exists
    try {
      await mongoose.connection.db
        .collection('insureds')
        .dropIndex('vehicles.plateNumber_1');
      console.log('✓ Successfully dropped unique index on vehicles.plateNumber');
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log('ℹ Index already removed or does not exist');
      } else {
        throw error;
      }
    }

    // Close connection
    await mongoose.connection.close();
    console.log('✓ Migration completed successfully');
    process.exit(0);

  } catch (error) {
    console.error('✗ Migration failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run migration
dropVehiclePlateNumberIndex();
