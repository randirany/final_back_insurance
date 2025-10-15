import departmentRouter from "./department/department.route.js";
import insuredRouter from "./insured/insured.route.js";
import userRouter from "./User/user.route.js";
import insuranceCompanyRouter from "./insuranceCompany/insuranceCompany.route.js";

import NotificationRouter from "./notification/notification.route.js";
import callRouter from "./call/call.route.js";
import TakafulAccidentReportRouter from "./TakafulAccidentReport/TakafulAccidentReport.route.js";
import TrustAccidentReportRouter from "./TrustAccidentReport/TrustAccidentReport.route.js";
import AlAhliaAccidentRouter from "./Al-AhliaAccident/Al-AhliaAccident.route.js";
import PalestineAccidentReportRouter from "./PalestineAccidentReport/PalestineAccidentReport.route.js";
import Al_MashreqAccidentReportRouter from "./Al-MashreqAccidentReport/Al-MashreqAccidentReport.route.js";
import HolyLandsReportRouter from "./HolyLandsReport/HolyLandsReport.route.js";
import auditsRouter from "./auditLog/auditLog.route.js";
import AgentRouter from "./Agents/Agents.route.js";
import accidentRouter from "./accident/accident.route.js";
import expenseRouter from "./expense/expense.route.js";
import revenueRouter from "./revenue/revenue.route.js";
import documentSettingsRouter from "./documentSettings/documentSettings.route.js";
import emailRouter from "./email/email.route.js";
import smsRouter from "./sms/sms.route.js";
import paymentRouter from "./payment/payment.route.js";



export {
    userRouter,
    departmentRouter,
    insuredRouter,
    insuranceCompanyRouter,

    NotificationRouter,
    callRouter,
    TakafulAccidentReportRouter,
    TrustAccidentReportRouter,
    AlAhliaAccidentRouter,
    PalestineAccidentReportRouter,
    Al_MashreqAccidentReportRouter,
    HolyLandsReportRouter,
    auditsRouter,
    AgentRouter,
    accidentRouter,
    expenseRouter,
    revenueRouter,
    documentSettingsRouter,
    emailRouter,
    smsRouter,
    paymentRouter


}
