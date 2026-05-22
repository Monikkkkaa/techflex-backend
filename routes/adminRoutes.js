const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

let admin = {
  name: "Techflex Admin",
  email: "monikapatidar1009@gmail.com",
  password: "Techflex@123",
  resetOtp: null,
  otpExpire: null,
};

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (email === admin.email && password === admin.password) {
    return res.json({
      success: true,
      message: "Login successful",
      token: "techflex_admin_token",
      admin: {
        name: admin.name,
        email: admin.email,
      },
    });
  }

  res.status(401).json({
    success: false,
    message: "Invalid email or password",
  });
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (email !== admin.email) {
      return res.status(404).json({
        success: false,
        message: "Admin email not found",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    admin.resetOtp = otp;
    admin.otpExpire = Date.now() + 5 * 60 * 1000;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: admin.email,
      subject: "Techflex Admin Password Reset OTP",
      text: `Your OTP is ${otp}. This OTP is valid for 5 minutes.`,
    });

    res.json({
      success: true,
      message: "OTP sent to admin email",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Email send failed",
      error: error.message,
    });
  }
});

router.post("/verify-otp", async (req, res) => {
  const { otp } = req.body;

  if (!admin.resetOtp || admin.resetOtp !== otp) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP",
    });
  }

  if (Date.now() > admin.otpExpire) {
    return res.status(400).json({
      success: false,
      message: "OTP expired",
    });
  }

  res.json({
    success: true,
    message: "OTP verified successfully",
  });
});

router.post("/reset-password", async (req, res) => {
  const { otp, newPassword } = req.body;

  if (!admin.resetOtp || admin.resetOtp !== otp) {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP",
    });
  }

  if (Date.now() > admin.otpExpire) {
    return res.status(400).json({
      success: false,
      message: "OTP expired",
    });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  admin.password = newPassword;
  admin.resetOtp = null;
  admin.otpExpire = null;

  res.json({
    success: true,
    message: "Password reset successfully",
  });
});

module.exports = router;