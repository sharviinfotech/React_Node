
module.exports = (() => {
  const externalApiMethods = require("../apiMethods/externalApiMethods");


  return {
    getMotorsLogsData: (req, res) => externalApiMethods.getMotorsLogsData(req.body, res),
    machineSensor: (req, res) => externalApiMethods.machinesensorSave(req.body, res),
    machineSensorupdate: (req, res) => externalApiMethods.machinesensorUpdate(req.body, res),
    machinesensorlist: (req, res) => externalApiMethods.machinesensorList(req.body, res),
    globalDelete: (req, res) => externalApiMethods.deleteGlobally(req.body, res),

    ppSave: (req, res) => externalApiMethods.productionPlanningSave(req, res),
    ppGet: (req, res) => externalApiMethods.getListOfPP(req, res),

    userCreationNew: (req, res) => externalApiMethods.userCreationSave(req, res),
    getAllUser: (req, res) => externalApiMethods.getAllUserLists(req, res),
    updateUserCreation: (req, res) => externalApiMethods.updateUserCreation(req, res),
    submitLogin: (req, res) => externalApiMethods.userLogin(req, res),
     reset: (req, res) => externalApiMethods.resetPassword(req, res),
     forgot: (req, res) => externalApiMethods.forgotPassword(req, res),

     cooisOperation: (req, res) => externalApiMethods.getProductionPlanning(req.body, res),
     submitLoginSap: (req, res) => externalApiMethods.submitLoginSap(req.body, res),
     saveDataEntry:(req, res) => externalApiMethods.saveDataEntry(req.body, res),
  };
})();
