import { roles } from "../../Servicess/roles.js";
export const endPoints={
   
   prof:[roles.Admin,roles.Insured,roles.Agents,roles.HeadOfEmployee],
    addHeadOfDepartmentToDepartmen:[roles.Admin],
    deleteHeadOfDepartmentToDepartmen:[roles.Admin],
    getHeadOfDepartment:[roles.Admin],
    addEmployee:[roles.Admin , roles.HeadOfEmployee],
    deleteEmployee:[roles.Admin , roles.HeadOfEmployee],
    updateEmployee:[roles.Admin , roles.HeadOfEmployee],
    allEmployee:[roles.Admin , roles.HeadOfEmployee],
    
}