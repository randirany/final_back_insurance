import Joi from "joi";
export const signin = {
    body: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': "يرجى ادخال عنوان بريد الكتروني صحيح"
        }),
        password: Joi.string().required().min(7).messages({
            'string.min': 'يجب ان تتكون كلمة المرور على الاقل من 7 حروف'
        })
    }).required()
};
export const forgetPassword = {
    body: Joi.object({
        newPassword: Joi.string().required().min(7).messages({
            'string.min': 'يجب ان يتكون كلمة المرور من 7 حرفًا على الاقل ',
        }),
        email: Joi.string().email().required().messages({
            'string.email': "يرجى ادخال عنوان بريد الكتروني صحيح"
        }),
        code: Joi.string().required()
    }).required()
};

export const sendCode = {
    body: Joi.object({
        email: Joi.string().required().email().messages({
            'string.email': "يرجى ادخال عنوان بريد الكتروني صحيح"
        }),
    }).required()
};

export const addAgent={
    body:Joi.object({
        name:Joi.string().required().min(3).max(25).messages({
                'string.min': "يجب ان يكون اسم المستخدم على الاقل حرفان ",
            'string.max': "يجب ان يكون اسم المستخدم على الاكثر 25 حرف"
        }),
        email: Joi.string().required().email().messages({
            'string.email': "يرجى ادخال عنوان بريد الكتروني صحيح"
        }),
        password: Joi.string().optional().min(7).messages({
            'string.min': 'يجب ان تتكون كلمة المرور على الاقل من 7 حروف'
        }),
    }).required()
}
export const addHeadOfDepartmentToDepartment={
    body:Joi.object({
        name:Joi.string().required().min(3).max(25).messages({
                'string.min': "يجب ان يكون اسم المستخدم على الاقل حرفان ",
            'string.max': "يجب ان يكون اسم المستخدم على الاكثر 25 حرف"
        }),
        email: Joi.string().required().email().messages({
            'string.email': "يرجى ادخال عنوان بريد الكتروني صحيح"
        }),
        password: Joi.string().required().min(7).messages({
            'string.min': 'يجب ان تتكون كلمة المرور على الاقل من 7 حروف'
        }),
    }).required()
}

export const AddEmployee={
    body:Joi.object({
        name:Joi.string().required().min(3).max(25).messages({
                'string.min': "يجب ان يكون اسم المستخدم على الاقل حرفان ",
            'string.max': "يجب ان يكون اسم المستخدم على الاكثر 25 حرف"
        }),
        email: Joi.string().required().email().messages({
            'string.email': "يرجى ادخال عنوان بريد الكتروني صحيح"
        }),
        password: Joi.string().required().min(7).messages({
            'string.min': 'يجب ان تتكون كلمة المرور على الاقل من 7 حروف'
        }),
    }).required()
}