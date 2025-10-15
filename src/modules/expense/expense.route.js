import { Router } from "express";
import * as expenseRoute from './controller/expense.controller.js';

const expenseRouter=Router();
expenseRouter.post('/addExpense',expenseRoute.addExpense)
expenseRouter.get('/getExpenses',expenseRoute.getExpenses)
expenseRouter.get('/getNetProfit',expenseRoute.getNetProfit)
expenseRouter.put('/:id',expenseRoute.updateExpense)
expenseRouter.delete('/:id',expenseRoute.deleteExpense)
expenseRouter.patch('/cancelInsurance/:insuredId/:vehicleId/:insuranceId', expenseRoute.cancelInsurance)
expenseRouter.get('/getCompanyFinancialReport',expenseRoute.getCompanyFinancialReport)
export default expenseRouter;