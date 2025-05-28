const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByEmail, createUser } = require('../models/userModel');

// LOGIN
const login = async (req, res) => {
  const { correo, password } = req.body;

  try {
    const user = await findUserByEmail(correo);
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol
      },
      process.env.JWT_SECRET || 'secreto123',
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login exitoso',
      usuario: {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        rol_id: user.rol_id,
        turno: user.turno,
        correo: user.correo
      },
      token
    });

  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// REGISTRO
const register = async (req, res) => {
  const { nombre, correo, password, rol_id, turno } = req.body;

  try {
    const existingUser = await findUserByEmail(correo);
    if (existingUser) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await createUser({ nombre, correo, password_hash, rol_id, turno });

    res.status(201).json({ message: 'Usuario registrado correctamente' });

  } catch (error) {
    console.error("❌ Error al registrar usuario:", error);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
};

module.exports = { login, register };
