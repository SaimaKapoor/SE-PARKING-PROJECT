import Vehicle from '../models/Vehicle.js';

/**
 * POST /api/vehicles
 * Register a new vehicle linked to the authenticated user.
 *
 * Requirements: FR-001, B-010
 */
export const registerVehicle = async (req, res) => {
  try {
    const { vehicleNumber, vehicleType, model } = req.body;
    const formattedNumber = vehicleNumber.toUpperCase();

    // Check if vehicle registration number already exists
    const existingVehicle = await Vehicle.findOne({
      vehicleNumber: formattedNumber,
    });

    if (existingVehicle) {
      return res.status(409).json({
        success: false,
        message: 'A vehicle with this registration number already exists',
      });
    }

    const vehicle = await Vehicle.create({
      vehicleNumber: formattedNumber,
      vehicleType,
      model: model || '',
      user: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Vehicle registered successfully',
      data: { vehicle },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A vehicle with this registration number already exists',
      });
    }

    console.error('Vehicle registration error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during vehicle registration',
    });
  }
};

/**
 * GET /api/vehicles
 * Retrieve all vehicles registered by the authenticated user.
 *
 * Requirements: FR-001, B-011
 */
export const getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      data: { vehicles },
    });
  } catch (error) {
    console.error('Fetch vehicles error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during vehicle retrieval',
    });
  }
};
