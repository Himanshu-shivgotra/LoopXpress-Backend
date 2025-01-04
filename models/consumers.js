import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const consumerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'name is required']
    },
    email: {
        type: String,
        required: [true, "email is required"],
        unique: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: [true, "password is required"],
        select: false
    },
    phoneNumber: {
        type: String,
        required: [true, "phone number is required"]
    },
    address: {
        type: String,
        required: [true, "address is required"]
    },
    dateOfBirth: {
        type: Date,
        required: [true, "date of birth is required"]
    }
}, { timestamps: true });

// Pre-save middleware for encrypting password
consumerSchema.pre('save', async function(next) {
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
consumerSchema.methods.isValidPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

// Create a mongoose model for Consumer
const ConsumerModel = mongoose.model('Consumer', consumerSchema);

export default ConsumerModel;
