import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    maxlength: [100, 'Title must not exceed 100 characters'],
    required: [true, 'Title is required'],
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },  
  colors: {
    type: [String],
    required: [true, 'Colors are required'],
  },
  imageUrls: [{
    type: String,
    required: [true, 'Image is required'],
  }],
  base64Images: [{
    type: String,
    validate: {
      validator: function (v) {
        return /^data:image\/[a-z]+;base64,/.test(v);
      },
      message: props => `${props.value} is not a valid Base64 image string!`
    }
  }],
  originalPrice: {
    type: Number,
    required: true,
  },
  discountedPrice: {
    type: Number,
    required: true,
    validate: {
      validator: function (value) {
        return value <= this.originalPrice;
      },
      message: props => `Discounted price must be less than or equal to original price`
    }
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  subcategory: {
    type: String,
    required: [true, 'Subcategory is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
  },
  weight: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [1000, 'Description must not exceed 1000 characters'],
    trim: true
  },
  highlights: {
    type: [String],
    validate: {
      validator: function (value) {
        return value.length <= 10;
      },
      message: 'You can specify up to 10 highlights only'
    }
  },
  stockAlert: {
    type: Number,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  manufacturingDate: {
    type: Date,
    required: true,
  },
  warranty: {
    type: String,
    required: true,
  },
  shippingInfo: {
    type: String,
    required: true,
  },
}, { timestamps: true });

productSchema.pre('save', function (next) {
  if (typeof this.originalPrice === 'string') {
    this.originalPrice = Number(this.originalPrice);
  }
  if (typeof this.discountedPrice === 'string') {
    this.discountedPrice = Number(this.discountedPrice);
  }
  if (typeof this.stockAlert === 'string') {
    this.stockAlert = Number(this.stockAlert);
  }
  if (typeof this.quantity === 'string') {
    this.quantity = Number(this.quantity);
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;
