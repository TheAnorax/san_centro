const express = require('express');
const router = express.Router();
const { obtenerInventario, getproductinventory, updateInventory, getInventoryByPasillo, update_inventory } = require('../appcontrollers/inventoryController');

// Ruta para obtener el inventario
router.get('/', obtenerInventario);
// router.get('/', getproductinventory);
router.post('/', updateInventory);
router.get('/getInventoryByPasillo', getInventoryByPasillo)
router.post('/update_inventory', update_inventory)

module.exports = router;
