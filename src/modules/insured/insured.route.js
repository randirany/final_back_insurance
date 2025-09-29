import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { endPoints } from "./insured.endpoint.js";
import * as insuredRoute from './controller/insured.controller.js'
import { fileValidation, myMulter } from "../../services/multer.js";
import  {checkDepartmentPermission}  from "../../middleware/checkDepartmentPermission.js";
const insuredRouter=Router();
insuredRouter.post('/addInsured',auth(endPoints.addInsured), myMulter(fileValidation.imag).single('image'),insuredRoute.addInsured )
insuredRouter.delete('/deleteInsured/:id', auth(endPoints.deleteInsured),insuredRoute.deleteInsured)
insuredRouter.get('/allInsured',auth(endPoints.allInsured),insuredRoute.showAll)
insuredRouter.get("/insurances/all",auth(endPoints.allInsured), insuredRoute.getAllVehicleInsurances);
insuredRouter.get('/findInsured/:id',auth(endPoints.findbyidInsured),insuredRoute.showById)
insuredRouter.patch('/updateInsured/:id',auth(endPoints.updateInsured), myMulter(fileValidation.imag).single('image'),insuredRoute.updateInsured)
insuredRouter.post('/addCar/:insuredId', auth(endPoints.addcar),myMulter(fileValidation.imag).single('image'),insuredRoute.addVehicle)
insuredRouter.post( "/customers/:id/upload",myMulter(fileValidation.all).array('files'),insuredRoute.uploadCustomerFiles)
insuredRouter.get('/allVec/:id', auth(endPoints.showVehicles),insuredRoute.showVehicles)
insuredRouter.patch('/updatevic/:insuredId/:vehicleId',auth(endPoints.updateCar),insuredRoute.updateVehicle)
insuredRouter.delete('/del/:insuredId/:vehicleId', auth(endPoints.removeCar),insuredRoute.removeVehicle)
insuredRouter.get('/getAllInsurances/:insuredId', insuredRoute.getAllInsurancesForInsured)
insuredRouter.post('/addInsurance/:insuredId/:vehicleId', auth(endPoints.addcar),myMulter(fileValidation.pdf).array("insuranceFiles", 10),insuredRoute.addInsuranceToVehicle)
insuredRouter.delete('/removeInsuranceFromVehicle/:insuredId/:vehicleId/:insuranceId',auth(endPoints.deleteInsured),insuredRoute.removeInsuranceFromVehicle)
insuredRouter.get('/get/:insuredId/:vehicleId',auth(endPoints.showVehicles),insuredRoute.getInsurancesForVehicle)
insuredRouter.post('/add/:insuredId/:vehicleId/:insuranceId',auth(endPoints.addcar),myMulter(fileValidation.imag).single('checkImage'),insuredRoute.addCheckToInsurance)
insuredRouter.get('/getCheck/:insuredId/:vehicleId/:insuranceId',auth(endPoints.showVehicles),insuredRoute.getInsuranceChecks)
insuredRouter.get('/getCheckCar/:insuredId/:vehicleId',auth(endPoints.showVehicles),insuredRoute.getAllChecksForVehicle)
insuredRouter.delete('/deleteCheck/:insuredId/:vehicleId/:checkId ', auth(endPoints.removeCar),insuredRoute.deleteCheckFromInsurance)
insuredRouter.get('/get_count',insuredRoute.getTotalInsuredCount)
insuredRouter.get('/getInsuredByMonth',insuredRoute.getInsuredByMonth)
insuredRouter.get('/getTotalCar',insuredRoute.getTotalVehicles)
insuredRouter.get('/getActiveInsurancesCount',insuredRoute.getActiveInsurancesCount )
insuredRouter.get('/getExpiredInsurancesCount',insuredRoute.getExpiredInsurancesCount )
insuredRouter.get('/getTotalPayments',insuredRoute.getTotalPayments)
insuredRouter.get('/getPaymentsByMethod',insuredRoute.getPaymentsByMethod)
insuredRouter.get('/getReturnedChecksAmount',insuredRoute.getReturnedChecksAmount)
insuredRouter.get('/getDebtsByCustomer',insuredRoute.getDebtsByCustomer)
insuredRouter.get('/getPaymentsAndDebtsByAgent/:agentName',insuredRoute.getPaymentsAndDebtsByAgent)
insuredRouter.get('/getCustomersReport',insuredRoute.getCustomersReport)
insuredRouter.get('/getVehicleInsuranceReport', insuredRoute.getVehicleInsuranceReport)
insuredRouter.get('/getOutstandingDebtsReport',insuredRoute.getOutstandingDebtsReport )




export default insuredRouter;