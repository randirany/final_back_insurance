import AuditLogModel from "../../../../DB/models/AuditLog.model.js";

export const findAllAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLogModel.find({}).sort({ createdAt: -1 }); // ترتيب من الأحدث إلى الأقدم

    if (!logs || logs.length === 0) {
      return res.status(404).json({ message: "No audit logs found." });
    }

    return res.status(200).json({ message: "Audit logs retrieved successfully", logs });

  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return res.status(500).json({ message: "An error occurred while fetching audit logs." });
  }
};
