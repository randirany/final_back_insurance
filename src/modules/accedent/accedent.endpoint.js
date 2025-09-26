import { roles } from "../../Servicess/roles.js";
export const endPoints={
    addAccident:[roles.Admin , roles.Employee , roles.HeadOfEmployee],
    deleteAccident:[roles.Admin , roles.Employee , roles.HeadOfEmployee],
    updateAccident:[roles.Admin , roles.Employee , roles.HeadOfEmployee],
    allAccident:[roles.Admin , roles.Employee , roles.HeadOfEmployee],
 
}