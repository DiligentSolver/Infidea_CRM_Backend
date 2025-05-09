const router = require("express").Router();

const {
  addGlobalSetting,
  getGlobalSetting,
  updateGlobalSetting,
  addStoreSetting,
  getStoreSetting,
  updateStoreSetting,
  getStoreSeoSetting,
  addStoreCustomizationSetting,
  getStoreCustomizationSetting,
  updateStoreCustomizationSetting,
} = require("../controllers/settingController");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

//add a global setting
router.post(
  "/global/add",
  authMiddleware,
  roleMiddleware(["admin"]),
  addGlobalSetting
);

//get global setting
router.get(
  "/global/all",
  authMiddleware,
  roleMiddleware(["admin"]),
  getGlobalSetting
);

//update global setting
router.put(
  "/global/update",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateGlobalSetting
);

//add a store setting
router.post(
  "/store-setting/add",
  authMiddleware,
  roleMiddleware(["admin"]),
  addStoreSetting
);

//update store setting
router.put(
  "/store-setting/update",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateStoreSetting
);

//store customization routes

//add a online store customization setting
router.post(
  "/store/customization/add",
  authMiddleware,
  roleMiddleware(["admin"]),
  addStoreCustomizationSetting
);

//get online store customization setting
router.get(
  "/store/customization/all",
  authMiddleware,
  roleMiddleware(["admin"]),
  getStoreCustomizationSetting
);

module.exports = router;
