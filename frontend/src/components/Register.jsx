import { useState } from 'react';
import { registerUser } from '../services/api';

export default function Register({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    vehicleNumber: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-() ]{7,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please provide a valid phone number (7-15 digits)';
    }

    if (!formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Vehicle registration number is required';
    } else if (formData.vehicleNumber.trim().length < 2) {
      newErrors.vehicleNumber = 'Vehicle number must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'vehicleNumber' ? value.toUpperCase() : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMsg('');

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim(),
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
      });

      setSuccessMsg('Registration successful! Redirecting to login...');
      setTimeout(() => {
        onSwitchToLogin();
      }, 1500);
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        const fieldErrors = {};
        err.errors.forEach((e) => {
          if (e.field) fieldErrors[e.field] = e.message;
        });
        setErrors(fieldErrors);
      }
      setServerError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-card">
      <div className="card-header">
        <h2 className="card-title">Create Account</h2>
        <p className="card-subtitle">Register to reserve parking slots and manage vehicles</p>
      </div>

      {serverError && <div className="alert alert-error">{serverError}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <form onSubmit={handleSubmit} className="form" noValidate>
        <div className="form-group">
          <label htmlFor="name" className="form-label">Full Name</label>
          <input
            id="name"
            name="name"
            type="text"
            className={`form-input ${errors.name ? 'input-error' : ''}`}
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
            disabled={loading}
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            className={`form-input ${errors.email ? 'input-error' : ''}`}
            placeholder="john@example.com"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className={`form-input ${errors.password ? 'input-error' : ''}`}
              placeholder="Min 6 characters"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.confirmPassword && (
              <span className="error-text">{errors.confirmPassword}</span>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="phone" className="form-label">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className={`form-input ${errors.phone ? 'input-error' : ''}`}
              placeholder="9876543210"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="vehicleNumber" className="form-label">
              Primary Vehicle Reg. Number
            </label>
            <input
              id="vehicleNumber"
              name="vehicleNumber"
              type="text"
              className={`form-input ${errors.vehicleNumber ? 'input-error' : ''}`}
              placeholder="KA01AB1234"
              value={formData.vehicleNumber}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.vehicleNumber && (
              <span className="error-text">{errors.vehicleNumber}</span>
            )}
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <div className="card-footer">
        <span>Already have an account?</span>{' '}
        <button
          type="button"
          className="link-button"
          onClick={onSwitchToLogin}
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
