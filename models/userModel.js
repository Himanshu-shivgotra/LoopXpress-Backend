import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    personalDetails: {
      fullName: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        unique: true ,
        lowercase: true,
        trim: true,
      },
      phoneNumber: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      password: {
        type: String,
        required: true,
        select: false,
      },
      profilePic: {
        type: String,
        default: '',
      },
    },
    businessDetails: {
      businessName: {
        type: String,
        required: true,
      },
      businessType: {
        type: String,
        required: true,
      },
      businessPhone: {
        type: String,
        required: true,
      },
      businessEmail: {
        type: String,
        required: true,
      },
      gstNumber: {
        type: String,
        required: true,
      },
    },
    bankDetails: {
      accountNumber: {
        type: String,
        required: true,
      },
      bankName: {
        type: String,
        required: true,
      },
      ifscCode: {
        type: String,
        required: true,
      },
    },
    resetPasswordToken: {
      type: String,
      default: null, // Null by default
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true } 
);


userSchema.pre('save',async function(next) {
    const hashRound = 10;
    if(this.personalDetails.password && (this.isModified('personalDetails.password') || this.isNew)){
        this.personalDetails.password = await bcrypt.hash(this.personalDetails.password,hashRound)
        console.log("password is hashing")
        console.log("password ",this.isModified('personalDetails.password'))
    }
    next()
})

// Instance method to compare passwords
userSchema.methods.isValidPassword = async function (candidatePassword, hashedPassword) {
  console.log('Candidate Password:', candidatePassword);
  const isMatch = await bcrypt.compare(candidatePassword, hashedPassword);
  console.log('Password Match:', isMatch);
  return isMatch;
};


// Create indexes for better query performance, especially for email
userSchema.index({ 'personalDetails.email': 1 });

// Create a mongoose model for User
const User = mongoose.model('User', userSchema);

export default User;