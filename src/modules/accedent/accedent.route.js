import { Router } from "express";
import { auth } from "../../midlleWare/auth.js";
import { endPoints } from "./accedent.endpoint.js";
import * as accidentRoute from './controller/accedent.controller.js'
import { fileValidation, myMulter } from "../../Servicess/multer.js";

const accidentRouter=Router();
accidentRouter.post('/addAccident/:insuredId/:vehicleId', auth(endPoints.addAccident), myMulter(fileValidation.imag).array('image'),accidentRoute.addAccident)
accidentRouter.get('/getAccident/:insuredId/:vehicleId',auth(endPoints.allAccident), accidentRoute.getAccidents)
accidentRouter.delete('/deleteAccident/:id',auth(endPoints.deleteAccident),accidentRoute.deleteAccident)
accidentRouter.get('/totalAccidents',accidentRoute.totalAccidents)
accidentRouter.patch('/updateAccident/:id' , auth(endPoints.updateAccident), accidentRoute.updateAccident)
accidentRouter.get('/accidentReport', accidentRoute.accidentReport)
export default accidentRouter;