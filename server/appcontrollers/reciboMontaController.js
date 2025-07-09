// const pool = require('../db'); // Importa la configuración de la base de datos

// // Controlador para obtener los datos de recibo monta
// const obtenerReciboMonta = async (req, res) => {
//   const query = `
//    SELECT 
//     m.id_recibo_compras AS id_recibo,
//     m.oc,
//     m.codigo,
//     m.cantidad_recibida,
//     m.cantidad_ubicada,
//     v.pieza_tarima,
//     p.des
//    FROM recibo_cedis m
//    LEFT JOIN productos p ON m.codigo = p.codigo_pro
//    LEFT JOIN volumetria v ON m.codigo = v.codigo
//    WHERE m.est = "I"
//      AND m.fecha_recibo >= CURDATE();  
//   `;

//   try {
//     const [results] = await pool.query(query);

//     const palletsGenerados = [];

//     results.forEach(result => {
//       const { cantidad_recibida, pieza_tarima } = result;
//       const totalPallets = Math.floor(cantidad_recibida / pieza_tarima);
//       const restante = cantidad_recibida % pieza_tarima;
//       const totalPalletsConRestante = restante > 0 ? totalPallets + 1 : totalPallets;

//       for (let i = 1; i <= totalPallets; i++) {
//         const pallet = {
//           id_recibo: result.id_recibo,
//           oc: result.oc,
//           codigo: result.codigo,
//           cantidad_recibida,
//           pallete: `${i}/${totalPalletsConRestante}`,
//           pallete_ubicado: result.pallete_ubicado,
//           pieza_tarima,
//           des: result.des,
//         };
//         palletsGenerados.push(pallet);
//       }

//       if (restante > 0) {
//         const palletRestante = {
//           id_recibo: result.id_recibo,
//           oc: result.oc,
//           codigo: result.codigo,
//           cantidad_recibida,
//           pallete: `${totalPalletsConRestante}/${totalPalletsConRestante}`,
//           pallete_ubicado: result.pallete_ubicado,
//           restante,
//           pieza_tarima: restante,
//           des: result.des,
//         };
//         palletsGenerados.push(palletRestante);
//       }
//     });

//     res.json(palletsGenerados);
//   } catch (error) {
//     console.error('Error al obtener los datos de reabastecimiento:', error);
//     res.status(500).json({ error: 'Error al obtener los datos de reabastecimiento' });
//   }
// };

// module.exports = { obtenerReciboMonta };



const pool = require('../db'); // Importa la configuración de la base de datos

// Controlador para obtener los datos de recibo monta
const obtenerReciboMonta = async (req, res) => {
  const query = `
   SELECT 
    m.id_recibo_compras AS id_recibo,
    m.oc,
    m.codigo,
    m.cantidad_recibida,
    m.cantidad_ubicada,
    v.pieza_tarima,
    p.des
   FROM recibo_cedis m
   LEFT JOIN productos p ON m.codigo = p.codigo_pro
   LEFT JOIN volumetria v ON m.codigo = v.codigo
   WHERE m.est = "I"
     AND m.fecha_recibo >= CURDATE();  
  `;

  try {
    const [results] = await pool.query(query);

    const palletsGenerados = [];

    results.forEach(result => {
      // Usar cantidad ubicada para los cálculos
      const { cantidad_ubicada, pieza_tarima } = result;

      // Verificar si la cantidad ubicada es mayor que 0 para continuar
      if (cantidad_ubicada > 0) {
        const totalPallets = Math.floor(cantidad_ubicada / pieza_tarima); // Pallets completos
        const restante = cantidad_ubicada % pieza_tarima; // Restante que no llena un pallet
        const totalPalletsConRestante = restante > 0 ? totalPallets + 1 : totalPallets;

        // Generar pallets completos
        for (let i = 1; i <= totalPallets; i++) {
          const pallet = {
            id_recibo: result.id_recibo,
            oc: result.oc,
            codigo: result.codigo,
            cantidad_ubicada, // Usar cantidad ubicada en lugar de recibida
            pallete: `${i}/${totalPalletsConRestante}`,
            pieza_tarima,
            des: result.des,
          };
          palletsGenerados.push(pallet);
        }

        // Si hay un restante, generar un pallet parcial
        if (restante > 0) {
          const palletRestante = {
            id_recibo: result.id_recibo,
            oc: result.oc,
            codigo: result.codigo,
            cantidad_ubicada,
            pallete: `${totalPalletsConRestante}/${totalPalletsConRestante}`,
            restante,
            pieza_tarima: restante, // El pallet parcial tiene solo la cantidad restante
            des: result.des,
          };
          palletsGenerados.push(palletRestante);
        }
      }
    });

    res.json(palletsGenerados);
  } catch (error) {
    console.error('Error al obtener los datos de reabastecimiento:', error);
    res.status(500).json({ error: 'Error al obtener los datos de reabastecimiento' });
  }
};

module.exports = { obtenerReciboMonta };
