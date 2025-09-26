import { Router } from "express";
import * as expenseRoute from './controller/expense.controller.js';

const expenseRouter=Router();
expenseRouter.post('/addExpense',expenseRoute.addExpense)
expenseRouter.get('/getNetProfit',expenseRoute.getNetProfit)
expenseRouter.patch('/cancelInsurance/:insuredId/:vehicleId/:insuranceId', expenseRoute.cancelInsurance)
expenseRouter.get('/getCompanyFinancialReport',expenseRoute.getCompanyFinancialReport)
export default expenseRouter;