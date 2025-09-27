import { ExpenseModel } from "../../../../DB/models/expense.model.js";
import { insuredModel } from "../../../../DB/models/Insured.model.js";


export const addExpense = async (req, res, next) => {
  try {
    const { title, amount, paidBy, paymentMethod, description } = req.body;
    if (!title || !amount || !paidBy) {
      return res.status(400).json({ message: "Title, amount, and paidBy are required" });
    }

    const receiptNumber = `EXP-${Date.now()}`; 
    const expense = new ExpenseModel({ title, amount, paidBy, paymentMethod, description, receiptNumber });
    const savedExpense = await expense.save();

    res.status(201).json({ message: "Expense recorded successfully", expense: savedExpense });
  } catch (error) {
    next(error);
  }
};



export const getNetProfit = async (req, res, next) => {
  try {
   
    const insureds = await insuredModel.find().select("vehicles.insurance");
    let totalRevenue = 0;
    insureds.forEach(insured => {
      insured.vehicles.forEach(vehicle => {
        vehicle.insurance.forEach(insurance => {
          totalRevenue += insurance.paidAmount || 0;
        });
      });
    });

 
    const expenses = await ExpenseModel.find();
    let totalExpenses = 0;
    expenses.forEach(expense => {
      totalExpenses += expense.amount || 0;
    });

   
    const netProfit = totalRevenue - totalExpenses;

    res.status(200).json({
      totalRevenue,   
      totalExpenses,    
      netProfit     
    });
  } catch (error) {
    next(error);
  }
};


export const getExpenses = async (req, res, next) => {
  try {
    const expenses = await ExpenseModel.find().sort({ date: -1 });
    res.status(200).json({ expenses });
  } catch (error) {
    next(error);
  }
};


export const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await ExpenseModel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Expense not found" });

    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    next(error);
  }
};





export const cancelInsurance = async (req, res, next) => {
  try {
    const { insuredId, vehicleId, insuranceId } = req.params;
    const { refundAmount, paidBy, paymentMethod, description } = req.body;

    const insured = await insuredModel.findById(insuredId);
    if (!insured) return res.status(404).json({ message: "The customer is not present" });

    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "The vehicle is not available. " });

    const insurance = vehicle.insurance.id(insuranceId);
    if (!insurance) return res.status(404).json({ message: "The insurance is not available." });

   
    insurance.insuranceStatus = "cancelled";
    insurance.refundAmount = refundAmount;

    await insured.save();

   
    const receiptNumber = `EXP-${Date.now()}`;
    const expense = new ExpenseModel({
      title: `Refund for cancelled insurance (${insurance.insuranceCompany})`,
      amount: refundAmount,
      paidBy,
      paymentMethod,
      description,
      receiptNumber,
    });
    await expense.save();

    return res.status(200).json({
      message: "Insurance cancelled and expense recorded",
      insurance,
      expense,
    });
  } catch (error) {
    next(error);
  }
};

export const getCompanyFinancialReport = async (req, res, next) => {
  try {
    const { startDate, endDate, agentName } = req.query;

 
    const insureds = await insuredModel.find().select("joining_date agentsName vehicles.insurance");
    let totalRevenue = 0;

    insureds.forEach(insured => {
    
      if (startDate && endDate) {
        const joining = new Date(insured.joining_date);
        if (joining < new Date(startDate) || joining > new Date(endDate)) return;
      }

     
      if (agentName && insured.agentsName !== agentName) return;

      insured.vehicles.forEach(vehicle => {
        vehicle.insurance.forEach(insurance => {
          totalRevenue += insurance.paidAmount || 0;
        });
      });
    });

  
    const expenseFilter = {};
    if (startDate && endDate) {
      expenseFilter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (agentName) {
      
      expenseFilter.paidBy = agentName;
    }

    const expenses = await ExpenseModel.find(expenseFilter);
    let totalExpenses = 0;
    expenses.forEach(expense => {
      totalExpenses += expense.amount || 0;
    });

    const netProfit = totalRevenue - totalExpenses;

    res.status(200).json({
      totalRevenue,
      totalExpenses,
      netProfit,
      details: {
        revenueRecords: totalRevenue,
        expensesRecords: expenses
      }
    });
  } catch (error) {
    next(error);
  }
};
