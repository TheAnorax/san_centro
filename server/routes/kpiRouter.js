const express = require("express");
const router = express.Router();

const { KpiProductividad, KpiEmbarques } = require("../controllers/kpiController");

router.get("/productividad", KpiProductividad);

router.get("/embarques", KpiEmbarques);


module.exports = router;
