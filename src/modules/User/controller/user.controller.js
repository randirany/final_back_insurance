import { userModel } from "../../../../DB/models/user.model.js";
import bcrypt from 'bcryptjs'
import { nanoid } from "nanoid"
import jwt from "jsonwebtoken"
import { sendEmail } from "../../../services/email.js";
import DepartmentModel from "../../../../DB/models/Department.model.js";
import AuditLogModel from "../../../../DB/models/AuditLog.model.js";

const logAudit = async ({ userId, action, entity, entityId, userName, oldValue = null, newValue = null }) => {
  try {
    await AuditLogModel.create({
      user: userId,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      userName
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};


export const profile = async (req, res) => {
  console.log(req.user);
  const user = await userModel.findById(req.user._id);
  if (!user) {
    res.json({ message: 'user not found' })
  }

  res.json({ message: 'success', user })
}
export const changeInformation = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (email) {
      const existEmail = await userModel.findOne({ email: email })
      if (existEmail && existEmail._id.toString() !== userId) {
        return res.status(400).json({ message: 'Email was already using' });
      }
      user.email = email;
    }

    if (name) {
      user.name = name;
    }

    await user.save();

    res.json({
      message: 'update success',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });


  } catch (err) {
    console.log(err)
  }
}
export const changepassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "user not found" })
    }
    const match = await bcrypt.compare(currentPassword, user.password)
    if (!match) {
      res.status(400).json({ message: 'please ensure that your password is correct' });
    }
    const hash = bcrypt.hashSync(newPassword, parseInt(process.env.saltRound))
    res.status(200).json({ message: "success", user });
    user.password = hash;
    await user.save();
    res.json({ message: 'change password successfully' });
  } catch (err) {
    console.log(err)
  }
}
export const addAdmin = async (req, res) => {

  const finduser = await userModel.findOne({ email: "admin123@gmail.com" })


  if (!finduser) {
    const hashedPassword = await bcrypt.hash('Islam123..', parseInt(process.env.saltRound))
    const adminUser = new userModel({
      name: "admin",
      email: "islam@ab.com",
      role: "admin",
      password: hashedPassword,
      status: "active"
    })

    await adminUser.save();
    res.status(200).json({ message: "sucsses", adminUser })

  } else {
    res.json({ message: "user already exists" })

  }

}
export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await userModel.findOne({ email: email })

    if (!user) {
      return res.status(404).json({ message: "user not found" })
    } else {
      const match = await bcrypt.compare(password, user.password)
      if (!match) {
        res.json('please ensure that your password is correct');
      } else {
        const token = jwt.sign({ id: user._id, email, name: user.name, role: user.role }, process.env.TokenSignIn, { expiresIn: 60 * 60 * 24 })
        res.status(200).json({ message: "success", token, user });

      }
    }

  } catch (error) {
    next(error)

  }
}

export const forgetPassward = async (req, res, next) => {
  const { code, email, newPassword } = req.body
  try {
    if (code == null) {
      return res.json('Please enter the reset code');
    } else {
      const hash = bcrypt.hashSync(newPassword, parseInt(process.env.saltRound))
      const user = await userModel.findOneAndUpdate({ email: email, sendCode: code }, { password: hash, sendCode: null })
      if (!user) {
        return res.json('Please verify the code');
      }
      return res.status(200).json({ message: "sucsses", user })
    }
  } catch (error) {

    next(error)
  }

}

export const sendCode = async (req, res, next) => {
  try {
    const { email } = req.body;


    const findUser = await userModel.findOne({ email: email });
    if (!findUser) {
      return res.status(404).json({ message: 'Please log in' })
    }


    const code = nanoid();


    const user = await userModel.findOneAndUpdate(
      { _id: findUser.id },
      { sendCode: code },
      { new: true }
    );

    if (!user) {
      return res.status(500).json({ message: 'Failed to send code' });
    }


    const message = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta http-equiv="x-ua-compatible" content="ie=edge">
              <title>Email Confirmation</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style type="text/css">
                body, table, td, a { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
                table, td { mso-table-rspace: 0pt; mso-table-lspace: 0pt; }
                img { -ms-interpolation-mode: bicubic; }
                a[x-apple-data-detectors] { font-family: inherit !important; font-size: inherit !important; font-weight: inherit !important; line-height: inherit !important; color: inherit !important; text-decoration: none !important; }
                div[style*="margin: 16px 0;"] { margin: 0 !important; }
                body { width: 100% !important; height: 100% !important; padding: 0 !important; margin: 0 !important; }
                table { border-collapse: collapse !important; }
                a { color: #1a82e2; }
                img { height: auto; line-height: 100%; text-decoration: none; border: 0; outline: none; }
              </style>
            </head>
            <body style="background-color: #e9ecef;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" bgcolor="#e9ecef">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px">
                      <tr>
                        <td align="center" valign="top" style="padding:36px 24px">
                          <a href="https://www.blogdesire.com" style="display:inline-block" target="_blank">
                           
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" bgcolor="#e9ecef">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px">
                      <tr>
                        <td align="left" bgcolor="#ffffff" style="padding:36px 24px 0;font-family:'Source Sans Pro',Helvetica,Arial,sans-serif;border-top:3px solid #d4dadf">
                          <h1 style="margin:0;font-size:32px;font-weight:700;letter-spacing:-1px;line-height:48px">Verify Your Email Address</h1>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" bgcolor="#e9ecef">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px">
                      <tr>
                        <td align="left" bgcolor="#ffffff" style="padding:24px;font-family:'Source Sans Pro',Helvetica,Arial,sans-serif;font-size:16px;line-height:24px">
                          <p style="margin: 0;">Thank you for using Insurance App! Use the following code rts:</p>
                          <h2 style="margin: 20px 0; font-size: 28px; font-weight: 700; color:hsl(94, 59%, 35%);">${code}</h2>
                        </td>
                      </tr>
                      <tr>
                        <td align="left" bgcolor="#ffffff" style="padding:24px;font-family:'Source Sans Pro',Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;border-bottom:3px solid #d4dadf">
                          <p style="margin:0">Insurance App</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" bgcolor="#e9ecef" style="padding:24px">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px">
                      <tr>
                        <td align="center" bgcolor="#e9ecef" style="padding:12px 24px;font-family:'Source Sans Pro',Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:#666">
                          <p style="margin: 0;">You received this email because we received a request for  App for your account.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
          `;


    await sendEmail(email, 'Password Reset Request', message);


    return res.status(200).json({ message: 'Code sent successfully ', user });

  } catch (error) {
    console.error(error);
    next(error)

  }
};


export const addHeadOfDepartmentToDepartment = async (req, res, next) => {
  const { name, email, password, status } = req.body;
  const { id } = req.params;

  try {

    const findDep = await DepartmentModel.findById(id);
    if (!findDep) {
      return res.status(404).json({ message: "This department doesn't exist" });

    }


    if (findDep.headOfEmployee) {
      return res.status(400).json({ message: "There is already a head of department for this department" });
    }

    const hashPassword = await bcrypt.hash(password, parseInt(process.env.saltRound));
    const findEmail = await userModel.findOne({ email: email });
    if (findEmail) {
      return res.status(400).json({ message: "User already exists" })

    } else {




      const newUser = new userModel({
        name,
        email,
        role: "HeadOfEmployee",
        password: hashPassword,
        departmentId: findDep._id,
        status
      });


      await newUser.save();


      findDep.headOfEmployee = {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status
      };

      await findDep.save();

      return res.status(201).json({
        message: "Head of department added successfully",
        department: findDep,
      });
    }
  } catch (error) {
    console.log(error.message)
    next(error)
  }
};


export const deleteHeadOfDepartmentFromDepartment = async (req, res, next) => {
  const { depId, userId } = req.params;

  try {
    const department = await DepartmentModel.findById(depId);

    if (!department) {
      return res.status(404).json({ message: "This department doesn't exist" });
    }


    if (!department.headOfEmployee || !department.headOfEmployee._id) {
      return res.status(400).json({ message: "This department has no head of employee" });
    }


    if (department.headOfEmployee._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: "This user is not the head of the department" });
    }


    department.headOfEmployee = null;
    await department.save();


    const user = await userModel.findById(userId);
    if (user) {
      await userModel.findByIdAndDelete(userId);
    }

    return res.status(200).json({ message: "Head of department removed successfully", department });

  } catch (error) {
    console.log(error.message);
    next(error);
  }
};




export const getHeadOfDepartment = async (req, res, next) => {
  const { id } = req.params;
  try {
    const findDep = await DepartmentModel.findById(id);
    if (!findDep) {
      return res.status(404).json({ message: "This department doesn't exist" })
    } else {
      const findHead = await findDep.headOfEmployee;
      res.status(200).json({ message: "Head of department retrieved", findHead });
    }

  } catch (error) {
    console.log(error.message);
    next(error)

  }
}

export const addEmployee = async (req, res, next) => {
  const { id } = req.params;
  const { name, email, password, status } = req.body;

  try {
    const findDep = await DepartmentModel.findById(id);
    if (!findDep) {
      return res.status(404).json({ message: "Department not found" });
    }

    const findEmail = await userModel.findOne({ email });
    if (findEmail) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashPassword = await bcrypt.hash(password, parseInt(process.env.saltRound));

    const newUser = new userModel({
      name,
      email,
      role: "employee",
      password: hashPassword,
      departmentId: id,
      status
    });

    await newUser.save();

    findDep.employees.push({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status
    });

    await findDep.save();

    const findUser = await userModel.findById(req.user._id)
    await logAudit({
      userId: req.user._id,
      action: `Add employee by ${findUser.name}`,
      userName: findUser.name,
      entity: "Employee",
      entityId: newUser._id,
      oldValue: null,
      newValue: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        departmentId: newUser.departmentId,
        status: newUser.status,
      }
    });

    return res.status(201).json({
      message: "Employee added successfully",
      department: findDep,
      employee: newUser,
    });

  } catch (error) {
    next(error);
  }
};



export const deleteEmployee = async (req, res, next) => {
  const { depId, employeeId } = req.params;

  try {
    const findDep = await DepartmentModel.findById(depId);
    if (!findDep) {
      return res.status(404).json({ message: "This department doesn't exist" });
    }

    const employeeIndex = findDep.employees.findIndex(emp => emp._id.toString() === employeeId);
    if (employeeIndex === -1) {
      return res.status(404).json({ message: "Employee not found in this department" });
    }


    const employeeData = findDep.employees[employeeIndex];


    findDep.employees.splice(employeeIndex, 1);
    await findDep.save();


    await userModel.findByIdAndDelete(employeeId);


    await logAudit({
      userId: req.user._id,
      action: "Delete",
      entity: "Employee",
      entityId: employeeId,
      oldValue: employeeData,
      newValue: null
    });

    return res.status(200).json({
      message: "Employee successfully deleted from the department",
      department: findDep,
    });

  } catch (error) {
    console.log(error.message);
    next(error);
  }
};















export const allEmployee = async (req, res, next) => {
  const { depId } = req.params;
  try {
    const findDep = await DepartmentModel.findById(depId);
    if (!findDep) {
      return res.status(404).json({ message: "This department doesn't exist" });
    }
    const employees = findDep.employees;
    return res.status(200).json({ message: "All employees", employees });

  } catch (error) {
    console.log(error.message);
    next(error)

  }
};
