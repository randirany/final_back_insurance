import { roles } from "../../Servicess/roles.js";
export const endPoints={

    addDepartment:[roles.Admin],
    deleteDepartment:[roles.Admin],
    updateDepartment:[roles.Admin],
    all:[roles.Admin],
    DepartmentById:[roles.Admin]
    
}