import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const cartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    title: {
        type: String,
        required: true // Making title required for better consistency
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    },
    imageUrl: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    subcategory: {
        type: String,
        required: false
    },
    price: {
        type: Number,
        required: true,
        min: 0
    }
});

const consumerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        select: false
    },
    phoneNumber: {
        type: String,
        default: null
    },
    address: {
        type: String,
        default: null
    },
    dateOfBirth: {
        type: Date,
        default: null
    },
    cart: {
        type: [cartItemSchema],
        default: []
    }
}, { timestamps: true });

// Pre-save middleware for encrypting password
consumerSchema.pre('save', async function (next) {
    const hashRound = 10;
    if (this.password && (this.isModified('password') || this.isNew)) {
        try {
            this.password = await bcrypt.hash(this.password, hashRound);
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Mongoose method to validate if password is correct
consumerSchema.methods.isValidPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Create a mongoose model for Consumer
const ConsumerModel = mongoose.model('Consumer', consumerSchema);

export default ConsumerModel;
