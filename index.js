import express from "express";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import ConnectDb from "./DB/connection.js";
import * as indexRouter from "./src/modules/index.route.js";
import errorHandler from "./src/middleware/errorHandler.js";
import socketService from "./src/services/socketService.js";
import setupProcessErrorHandlers from "./src/utils/processErrorHandlers.js";

dotenv.config();

setupProcessErrorHandlers();

const app = express();
const server = http.createServer(app);

const io = socketService.initialize(server);
const onlineUsers = socketService.getOnlineUsers();

export { io, onlineUsers };

app.use(express.json());
app.use(cors());
app.use(helmet());

ConnectDb();

app.use("/api/v1/user", indexRouter.userRouter);
app.use("/api/v1/department", indexRouter.departmentRouter);
app.use("/api/v1/insured", indexRouter.insuredRouter);
app.use("/api/v1/company", indexRouter.insuranceCompanyRouter);

app.use("/api/v1/notification", indexRouter.NotificationRouter);
app.use(
  "/api/v1/TakafulAccidentReport",
  indexRouter.TakafulAccidentReportRouter
);
app.use("/api/v1/TrustAccidentReport", indexRouter.TrustAccidentReportRouter);
app.use("/api/v1/AhliaAccidentReport", indexRouter.AlAhliaAccidentRouter);
app.use(
  "/api/v1/PlestineAccidentReport",
  indexRouter.PalestineAccidentReportRouter
);
app.use(
  "/api/v1/Al_MashreqAccidentReport",
  indexRouter.Al_MashreqAccidentReportRouter
);
app.use("/api/v1/HolyLand", indexRouter.HolyLandsReportRouter);
app.use("/api/v1/call", indexRouter.callRouter);
app.use("/api/v1/AuditLog", indexRouter.auditsRouter);
app.use("/api/v1/agents", indexRouter.AgentRouter);
app.use("/api/v1/accident", indexRouter.accidentRouter);
app.use("/api/v1/expense", indexRouter.expenseRouter);
app.use("/api/v1/revenue", indexRouter.revenueRouter);
app.use(errorHandler);
app.use("*", (req, res) => {
  res.status(404).json({ message: "Invalid Route" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(` running in ${PORT}`);
});
