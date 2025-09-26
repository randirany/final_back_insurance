import { Router } from "express";
import * as insuranceCompanyRoute from './controller/insuranceCompany.controller.js'
import { auth } from "../../middleware/auth.js";
import { endpoints } from "./insuranceCompany.endpoint.js";
import  {checkDepartmentPermission}  from "../../middleware/checkDepartmentPermission.js";
const insuranceCompanyRouter=Router();
insuranceCompanyRouter.post('/addInsuranceCompany',auth(endpoints.addCompany),insuranceCompanyRoute.addInsuranceCompany)
insuranceCompanyRouter.patch('/updateInsuranceCompany/:id',auth(endpoints.upateCompany),insuranceCompanyRoute.updateInsuranceCompany)
insuranceCompanyRouter.delete('/delete/:id',auth(endpoints.deleteCompany),insuranceCompanyRoute.deleteInsuranceCompany)
insuranceCompanyRouter.get('/all',auth(endpoints.allCompany),insuranceCompanyRoute.getAllInsuranceCompanies)
export default insuranceCompanyRouter;