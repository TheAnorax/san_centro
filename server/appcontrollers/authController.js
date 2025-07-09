const pool = require('../db'); // Asegúrate que apunta bien
const bcrypt = require('bcrypt');

const login = async (req, res) => {
  const { username, password } = req.body;
  console.log({ username, password });

  const query = "SELECT * FROM usuarios WHERE correo = ? LIMIT 1";

  try {
    const [results] = await pool.query(query, [username]);

    if (results.length === 0) {
      return res.status(401).send("Usuario no encontrado");
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).send("Contraseña incorrecta");
    }

    // Obtén el rol por separado si está relacionado con otra tabla
    const [rolResults] = await pool.query("SELECT nombre FROM roles WHERE id = ?", [user.rol_id]);
    const role = rolResults.length > 0 ? rolResults[0].nombre : null;

    const userData = {
      name: user.nombre,
      role: role,
      id_usu: user.id
    };

    res.status(200).json(userData);
  } catch (error) {
    console.error("Error al realizar la consulta:", error);
    res.status(500).send("Error interno del servidor");
  }
};

module.exports = { login };
