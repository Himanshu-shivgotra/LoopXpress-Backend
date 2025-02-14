import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  locationWiseStock: [{
    locationName: {
      type: String,
      required: true
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Add pre-save hook to calculate total quantity
inventorySchema.pre('save', function(next) {
  if (this.isModified('locationWiseStock')) {
    this.quantity = this.locationWiseStock.reduce((total, location) => {
      return total + location.stock;
    }, 0);
  }
  next();
});

export default mongoose.model('Inventory', inventorySchema);
