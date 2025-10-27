import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { endPoints } from "./insured.endpoint.js";
import * as insuredRoute from './controller/insured.controller.js'
import { fileValidation, myMulter } from "../../services/multer.js";
import  {checkDepartmentPermission}  from "../../middleware/checkDepartmentPermission.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import * as validation from "./insured.validation.js";
import { externalApiLimiter, uploadLimiter } from "../../middleware/rateLimiter.js";
import { cacheMiddleware, paginationCacheKey, reportCacheKey } from "../../middleware/cacheMiddleware.js";

const insuredRouter=Router();
insuredRouter.post('/addInsured',auth(endPoints.addInsured), myMulter(fileValidation.imag).single('image'), validateRequest(validation.addInsuredSchema), insuredRoute.addInsured )
insuredRouter.delete('/deleteInsured/:id', auth(endPoints.deleteInsured),insuredRoute.deleteInsured)
insuredRouter.get('/allInsured',auth(endPoints.allInsured), cacheMiddleware(300, paginationCacheKey), validateRequest(validation.paginationQuerySchema, 'query'), insuredRoute.showAll)
insuredRouter.get("/insurances/all",auth(endPoints.allInsured), cacheMiddleware(300, paginationCacheKey), validateRequest(validation.vehicleInsurancesFilterSchema, 'query'), insuredRoute.getAllVehicleInsurances);
insuredRouter.get('/findInsured/:id',auth(endPoints.findbyidInsured),insuredRoute.showById)
insuredRouter.get('/searchCustomer',auth(endPoints.searchCustomer), validateRequest(validation.searchCustomerQuerySchema, 'query'), insuredRoute.searchCustomer)
insuredRouter.patch('/updateInsured/:id',auth(endPoints.updateInsured), myMulter(fileValidation.imag).single('image'), validateRequest(validation.updateInsuredSchema), insuredRoute.updateInsured)
insuredRouter.post('/addCar/:insuredId', auth(endPoints.addcar),myMulter(fileValidation.imag).single('image'), validateRequest(validation.addVehicleSchema), insuredRoute.addVehicle)
insuredRouter.post( "/customers/:id/upload", uploadLimiter, myMulter(fileValidation.all).array('files'),insuredRoute.uploadCustomerFiles)
insuredRouter.get('/allVec/:id', auth(endPoints.showVehicles),insuredRoute.showVehicles)
insuredRouter.patch('/updatevic/:insuredId/:vehicleId',auth(endPoints.updateCar), validateRequest(validation.updateVehicleSchema), insuredRoute.updateVehicle)
insuredRouter.delete('/del/:insuredId/:vehicleId', auth(endPoints.removeCar),insuredRoute.removeVehicle)
insuredRouter.get('/getAllInsurances/:insuredId', insuredRoute.getAllInsurancesForInsured)
insuredRouter.post('/addInsurance/:insuredId/:vehicleId', auth(endPoints.addcar),myMulter(fileValidation.pdf).array("insuranceFiles", 10), validateRequest(validation.addInsuranceSchema), insuredRoute.addInsuranceToVehicle)
insuredRouter.delete('/removeInsuranceFromVehicle/:insuredId/:vehicleId/:insuranceId',auth(endPoints.deleteInsured),insuredRoute.removeInsuranceFromVehicle)
insuredRouter.get('/get/:insuredId/:vehicleId',auth(endPoints.showVehicles),insuredRoute.getInsurancesForVehicle)
insuredRouter.post('/add/:insuredId/:vehicleId/:insuranceId',auth(endPoints.addcar),myMulter(fileValidation.imag).single('checkImage'), validateRequest(validation.addCheckSchema), insuredRoute.addCheckToInsurance)
insuredRouter.get('/getCheck/:insuredId/:vehicleId/:insuranceId',auth(endPoints.showVehicles),insuredRoute.getInsuranceChecks)
insuredRouter.get('/getCheckCar/:insuredId/:vehicleId',auth(endPoints.showVehicles),insuredRoute.getAllChecksForVehicle)
insuredRouter.delete('/deleteCheck/:insuredId/:vehicleId/:checkId ', auth(endPoints.removeCar),insuredRoute.deleteCheckFromInsurance)
insuredRouter.get('/get_count', cacheMiddleware(600), insuredRoute.getTotalInsuredCount)
insuredRouter.get('/customersOverview', cacheMiddleware(600), insuredRoute.getCustomersOverview)
insuredRouter.get('/getTotalCar', cacheMiddleware(600), insuredRoute.getTotalVehicles)
insuredRouter.get('/getActiveInsurancesCount', cacheMiddleware(600), insuredRoute.getActiveInsurancesCount )
insuredRouter.get('/getExpiredInsurancesCount', cacheMiddleware(600), insuredRoute.getExpiredInsurancesCount )
insuredRouter.get('/getTotalPayments', cacheMiddleware(600), insuredRoute.getTotalPayments)
insuredRouter.get('/getPaymentsByMethod', cacheMiddleware(600), insuredRoute.getPaymentsByMethod)
insuredRouter.get('/getReturnedChecksAmount', cacheMiddleware(600), insuredRoute.getReturnedChecksAmount)
insuredRouter.get('/getAllCheques', cacheMiddleware(300), insuredRoute.getAllCheques)
insuredRouter.get('/getDebtsByCustomer', cacheMiddleware(600), insuredRoute.getDebtsByCustomer)
insuredRouter.get('/getPaymentsAndDebtsByAgent/:agentName',insuredRoute.getPaymentsAndDebtsByAgent)
insuredRouter.get('/getCustomersReport', cacheMiddleware(300, reportCacheKey), validateRequest(validation.customerReportQuerySchema, 'query'), insuredRoute.getCustomersReport)
insuredRouter.get('/getVehicleInsuranceReport', cacheMiddleware(300, reportCacheKey), validateRequest(validation.vehicleInsuranceReportQuerySchema, 'query'), insuredRoute.getVehicleInsuranceReport)
insuredRouter.get('/getOutstandingDebtsReport', cacheMiddleware(300, reportCacheKey), insuredRoute.getOutstandingDebtsReport )
insuredRouter.get('/vehicle-data/:plateNumber', externalApiLimiter, auth(endPoints.showVehicles), insuredRoute.getVehicleDataFromGovApi)
insuredRouter.get('/dashboard-statistics', cacheMiddleware(600), insuredRoute.getDashboardStatistics)
insuredRouter.get('/financial-overview', cacheMiddleware(600), insuredRoute.getFinancialOverview)
insuredRouter.get('/customers-with-active-insurance', auth(endPoints.allInsured), cacheMiddleware(300, paginationCacheKey), insuredRoute.getCustomersWithActiveInsurance)

// Add payment to existing insurance
insuredRouter.post('/addPayment/:insuredId/:vehicleId/:insuranceId', auth(endPoints.addcar), validateRequest(validation.addPaymentSchema), insuredRoute.addPaymentToInsurance)

// Get all payments with filters
insuredRouter.get('/payments/all', auth(endPoints.allInsured), cacheMiddleware(300, paginationCacheKey), insuredRoute.getAllPayments)

// Get due insurances and cheques
insuredRouter.get('/due-items/all', auth(endPoints.allInsured), cacheMiddleware(300, paginationCacheKey), insuredRoute.getDueItems)

export default insuredRouter;