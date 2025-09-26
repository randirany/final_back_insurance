import { Router } from "express";
import { auth } from "../../midlleWare/auth.js";
import { endPoints } from "./department.endpoints.js";
import * as departmentRoute from './controller/department.controller.js'

const departmentRouter=Router();
departmentRouter.post( '/add', auth(endPoints.addDepartment), departmentRoute.AddDepartment)
departmentRouter.delete('/delete/:id', auth(endPoints.deleteDepartment), departmentRoute.deleteDepartment)
departmentRouter.get('/all', auth(endPoints.all),departmentRoute.allDepartment)
departmentRouter.get('/dep/:id', auth(endPoints.DepartmentById),departmentRoute.depById)
departmentRouter.patch('/update/:id',auth(endPoints.updateDepartment),departmentRoute.updateDep)
export default departmentRouter;