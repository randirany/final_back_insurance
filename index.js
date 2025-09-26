
import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import ConnectDb from './DB/connection.js';
import * as indexRouter from './src/modules/index.route.js';
import errorHandler from './src/midlleWare/errorHandler.js';
import helmet from "helmet";
dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log(" online user", socket.id);

  socket.on("registerUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} has been registered with Socket ID: ${socket.id}`);
  });

  socket.on("disconnect", () => {
    console.log(" user offline", socket.id);
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User ${userId} has been removed from the list of connected users`);
        break;
      }
    }
  });
});


export { io, onlineUsers };

app.use(express.json());
app.use(cors());
app.use(helmet());

ConnectDb();


app.use('/api/v1/user', indexRouter.userRouter);
app.use('/api/v1/department', indexRouter.departmentRouter);
app.use('/api/v1/insured', indexRouter.insuredRouter);
app.use('/api/v1/company', indexRouter.insuranceCompanyRouter);

app.use('/api/v1/notification', indexRouter.NotificationRouter);
app.use('/api/v1/TakafulAccidentReport', indexRouter.TakafulAccidentReportRouter)
app.use('/api/v1/TrustAccidentReport', indexRouter.TrustAccidentReportRouter)
app.use('/api/v1/AhliaAccidentReport', indexRouter.AlAhliaAccidentRouter)
app.use('/api/v1/PlestineAccidentReport', indexRouter.PalestineAccidentReportRouter)
app.use('/api/v1/Al_MashreqAccidentReport', indexRouter.Al_MashreqAccidentReportRouter)
app.use('/api/v1/HolyLand', indexRouter.HolyLandsReportRouter)
app.use('/api/v1/call', indexRouter.callRouter)
app.use('/api/v1/AuditLog', indexRouter.auditsRouter)
app.use('/api/v1/agents', indexRouter.AgentRouter)
app.use('/api/v1/accident', indexRouter.accidentRouter)
app.use('/api/v1/expense', indexRouter.expenseRouter)
app.use('/api/v1/revenue', indexRouter.revenueRouter)
app.use(errorHandler);
app.use('*', (req, res) => {
  res.status(404).json({ message: " page not fount  " });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(` running in ${PORT}`);
});
