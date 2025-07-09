const pool = require('../db');  // Importa la configuración de la base de datos

// Controlador para obtener datos de inventario
const obtenerInventario = async (req, res) => {
  const query = `
  SELECT 
    id_ubi,
    ubi,
    codigo,
    _pz,
    _inner,
    _master,
    _pallet,
    estado,
    responsable,
    pasillo, 
    nivel
  FROM inventory 
  WHERE estado IS NULL
`;
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(query);

    // Convertir los valores `null` a `0` en cada `item`
    const processedResults = results.map((item) => {
      // Recorrer todas las propiedades y asignar 0 si es null
      Object.keys(item).forEach((key) => {
        if (item[key] === null) {
          item[key] = typeof item[key] === "number" ? 0 : ""; // `0` para números y cadena vacía para strings
        }
      });
      return item;
    });

    // Agrupamos los datos por rol (P{pasillo}S{responsable})
    const organizedData = {};

    processedResults.forEach((item) => {
      const { pasillo, responsable, nivel } = item;

      // Generar el rol en el formato P{pasillo}S{responsable}
      const rol = `P${pasillo}S${responsable}`;

      // Si el rol no existe en `organizedData`, lo inicializamos
      if (!organizedData[rol]) {
        organizedData[rol] = {
          rol: rol,
          pasillo: pasillo,
          responsable: responsable,
          ubicaciones: {
            1: [],
            2: [],
            3: [],
            4: [],
            5: [],
          },
        };
      }

      // Añadimos la ubicación al nivel correspondiente (1 o 2)
      if (nivel === 1 || nivel === 2 || nivel === 3 || nivel === 4) {
        organizedData[rol].ubicaciones[nivel].push(item);
      }
    });

    // Ordenamos los datos según los criterios
    const finalData = Object.values(organizedData).map((group) => {
      // Ordenar nivel 1 de menor a mayor y nivel 2 de mayor a menor
      group.ubicaciones[1] = group.ubicaciones[1].sort((a, b) =>
        a.ubi.localeCompare(b.ubi)
      );
      group.ubicaciones[2] = group.ubicaciones[2].sort((a, b) =>
        b.ubi.localeCompare(a.ubi)
      );
      group.ubicaciones[3] = group.ubicaciones[3].sort((a, b) =>
        b.ubi.localeCompare(b.ubi)
      );
      group.ubicaciones[4] = group.ubicaciones[4].sort((a, b) =>
        b.ubi.localeCompare(a.ubi)
      );
      group.ubicaciones[5] = group.ubicaciones[5].sort((a, b) =>
        b.ubi.localeCompare(a.ubi)
      );

      return group;
    });

    // Enviamos la respuesta organizada en grupos por rol
    res.json(finalData);
  } catch (error) {
    console.error("Error al obtener los datos de inventory:", error);
    res.status(500).json({ error: "Error al obtener los datos de inventory" });
  }
};

const getproductinventory = async (req, res) => {
  console.log("✅ La función `getproductinventory` se está ejecutando...");

  const { codigo_pz, codigo_inner, codigo_master } = req.query;

  console.log("🔍 Códigos recibidos en la consulta:");
  console.log("   - código_pz:", codigo_pz || "No proporcionado");
  console.log("   - código_inner:", codigo_inner || "No proporcionado");
  console.log("   - código_master:", codigo_master || "No proporcionado");

  if (!codigo_pz && !codigo_inner && !codigo_master) {
    console.error("❌ Error: No se recibió ningún código válido");
    return res.status(400).json({ error: "Debe proporcionar al menos un código (codigo_pz, codigo_inner o codigo_master)" });
  }

  let query = `
    SELECT 
      id_prod,
      codigo_pro,
      des,
      _pz,
      _inner,
      _master, 
      _palet,
      code_pz,
      code_inner,
      code_master
    FROM productos
    WHERE (code_pz = ? OR ? IS NULL) 
       OR (code_inner = ? OR ? IS NULL) 
       OR (code_master = ? OR ? IS NULL);
  `;

  let queryParams = [
    codigo_pz || null, codigo_pz || null,
    codigo_inner || null, codigo_inner || null,
    codigo_master || null, codigo_master || null
  ];

  console.log("📝 Consulta SQL a ejecutar:", query);
  console.log("📌 Parámetros enviados:", queryParams);

  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.query(query, queryParams);

    console.log("🔍 Resultados de la consulta:", results.length > 0 ? results : "No se encontraron resultados");

    if (results.length === 0) {
      return res.status(404).json({ message: "No se encontraron productos con los códigos proporcionados" });
    }

    res.json(results);
  } catch (error) {
    console.error("❌ Error en la consulta de productos:", error);
    res.status(500).json({ error: "Error al obtener los datos de productos" });
  } finally {
    if (connection) connection.release();
  }
};


// const updateInventory = async (req, res ) => {
//   const {
//     id_ubi,
//     estado,
//     hora_inicio,
//     hora_final,
//     codigo,
//     pz,
//     inner,
//     master,
//     pallet,
//     cantidad,
//     manual,
//     id_usu
//   } = req.body;

//   console.log("UpdateInventoty", req.body)

//   const query = `
//     UPDATE inventory SET
//       estado = ?,
//       hora_inicio = ?,
//       hora_final = ?,
//       codigo = ?,
//       _pz = ?,
//       _inner = ?,
//       _master = ?,
//       _pallet = ?,
//       cantidad = ?,
//       manual = ?,
//       id_usu = ?
//     WHERE id_ubi = ?
//   `;
//   let connection;
//   connection = await pool.getConnection();
//   const values = [
//     estado, hora_inicio, hora_final, codigo, pz, inner, master, pallet, cantidad, manual, id_usu, id_ubi
//   ];

//   connection.query(query, values, (error, results) => {
//     if (error) {
//       return res.status(500).json({ error: "Error al actualizar el inventario" });
//     }
//     res.status(200).json({ message: "Inventario actualizado correctamente" });
//   });
// };

const updateInventory = async (req, res) => {
  const {
    id_ubi,
    estado,
    hora_inicio,
    hora_final,
    codigo,
    pz,
    inner,
    master,
    pallet,
    cantidad,
    manual,
    id_usu,
  } = req.body;

  console.log("UpdateInventory", req.body);

  const query = `
    UPDATE inventory SET
      estado = ?,
      hora_inicio = ?,
      hora_final = ?,
      codigo = ?,
      _pz = ?,
      _inner = ?,
      _master = ?,
      _pallet = ?,
      cantidad = ?,
      manual = ?,
      id_usu = ?
    WHERE id_ubi = ?
  `;

  let connection;
  try {
    // Obtener conexión de la base de datos
    connection = await pool.getConnection();

    // Ejecutar la consulta de forma asíncrona
    const [result] = await connection.execute(query, [
      estado,
      hora_inicio,
      hora_final,
      codigo,
      pz,
      inner,
      master,
      pallet,
      cantidad,
      manual,
      id_usu,
      id_ubi,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "No se encontró la ubicación para actualizar." });
    }

    res.status(200).json({ message: "Inventario actualizado correctamente." });
  } catch (error) {
    console.error("Error al actualizar el inventario:", error);
    res.status(500).json({ error: "Error al actualizar el inventario" });
  } finally {
    if (connection) connection.release(); // Liberar la conexión en cualquier caso
  }
};

const getInventoryByPasillo = async (req, res) => {
  const query = `
      SELECT 
      id_ubi,
        pasillo, 
        nivel, 
        ubi, 
        codigo, 
        cantidad, 
        asignado
      FROM 
        inventoryalma 
      WHERE 
        pasillo IN (1, 2, 3, 4, 5, 6, 7, 8, 21)
        AND estado IS NULL
      ORDER BY 
        pasillo, 
        nivel, 
        ubi;
    `;

  let connection;
  connection = await pool.getConnection();

  try {
    // Ejecutar la consulta
    const [results] = await connection.query(query);

    // Procesar los datos
    const organizedData = {};

    results.forEach((row) => {
      const { pasillo, nivel, ubi, codigo, cantidad, asignado, id_ubi } = row;

      // Inicializar el pasillo si no existe
      if (!organizedData[pasillo]) {
        organizedData[pasillo] = {
          asignado: {
            1: {},
            2: {},
          },
        };
      }

      // Inicializar el asignado si no existe
      if (!organizedData[pasillo].asignado[asignado]) {
        organizedData[pasillo].asignado[asignado] = {};
      }

      // Inicializar el nivel si no existe
      if (!organizedData[pasillo].asignado[asignado][nivel]) {
        organizedData[pasillo].asignado[asignado][nivel] = [];
      }

      // Agregar la fila a la estructura correspondiente
      organizedData[pasillo].asignado[asignado][nivel].push({
        id_ubi,
        ubi,
        codigo,
        cantidad,
      });
    });

    // Ordenar los niveles según las reglas específicas
    Object.keys(organizedData).forEach((pasillo) => {
      const asignados = organizedData[pasillo].asignado;

      Object.keys(asignados).forEach((asignado) => {
        Object.keys(asignados[asignado]).forEach((nivel) => {
          // Convertir nivel a número para usarlo en la comparación
          const nivelNum = parseInt(nivel, 10);

          // Aplicar la regla de ordenamiento según el nivel
          if (
            nivelNum === 2 ||
            nivelNum === 3 ||
            nivelNum === 5 ||
            nivelNum === 7
          ) {
            // Niveles 2, 3, 5, 7: ordenar de menor a mayor
            asignados[asignado][nivel].sort((a, b) =>
              a.ubi.localeCompare(b.ubi)
            );
          } else if (nivelNum === 4 || nivelNum === 6 || nivelNum === 8) {
            // Niveles 4, 6, 8: ordenar de mayor a menor
            asignados[asignado][nivel].sort((a, b) =>
              b.ubi.localeCompare(a.ubi)
            );
          }
        });
      });
    });

    // Enviar los datos organizados
    res.status(200).json(organizedData);
  } catch (error) {
    console.error("Error al obtener los datos de productos:", error);
    res.status(500).json({ error: "Error al obtener los datos de productos" });
  }
};

// const update_inventory = async (req, res) => {
//   console.log("Datos recibidos por el servidor:", req.body);

//   const { idUbi, codigo, cantidad } = req.body;

//   if (!idUbi || !codigo || !cantidad) {
//     console.log("Datos faltantes en la solicitud");
//     return res.status(400).json({ error: "Todos los campos son requeridos" });
//   }

//   const query = `
//     UPDATE inventoryalma
//     SET codigo = ?, cantidad = ?
//     WHERE id_ubi = ?;
//   `;

//   let connection;

//   try {
//     // Obtener la conexión
//     connection = await pool.getConnection();

//     // Ejecutar la consulta de forma asíncrona
//     const [result] = await connection.execute(query, [codigo, cantidad, idUbi]);

//     if (result.affectedRows === 0) {
//       console.log("No se encontró la ubicación para actualizar.");
//       return res.status(404).json({ error: "No se encontró la ubicación" });
//     }

//     console.log("Actualización exitosa.");
//     res.json({ message: "Actualización exitosa" });
//   } catch (error) {
//     console.error("Error general:", error);
//     res.status(500).json({ error: "Error interno del servidor" });
//   } finally {
//     if (connection) {
//       connection.release(); // Asegura que la conexión se cierre en cualquier caso
//     }
//   }
// };

const update_inventory = async (req, res) => {
  console.log("📥 Datos recibidos:", req.body);

  const { idUbi, codigo, cantidad } = req.body;

  if (!idUbi || !codigo || !cantidad) {
    console.log("⚠️ Datos faltantes en la solicitud.");
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  const query = `
    UPDATE inventoryalma
    SET codigo = ?, cantidad = ?, estado = 'F'
    WHERE id_ubi = ?;
  `;

  let connection;

  try {
    // Obtener la conexión con timeout para evitar bloqueos
    connection = await pool.getConnection();
    await connection.beginTransaction(); // Iniciar transacción

    // Ejecutar la actualización
    const [result] = await connection.execute(query, [codigo, cantidad, idUbi]);

    if (result.affectedRows === 0) {
      console.log("🚫 No se encontró la ubicación para actualizar.");
      await connection.rollback();
      return res.status(404).json({ error: "No se encontró la ubicación" });
    }

    await connection.commit(); // Confirmar cambios
    console.log("✅ Actualización exitosa. Estado actualizado a 'F'.");
    res.json({ message: "Actualización exitosa, estado actualizado a 'F'." });

  } catch (error) {
    if (connection) await connection.rollback(); // Revertir cambios en caso de error
    console.error("❌ Error en la actualización:", error);
    res.status(500).json({ error: "Error interno del servidor" });

  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión siempre
      console.log("🔄 Conexión liberada.");
    }
  }
};


module.exports = {
  obtenerInventario,
  getproductinventory,
  updateInventory,
  getInventoryByPasillo,
  update_inventory,
};
