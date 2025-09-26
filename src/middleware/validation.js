const dataMethod=['query','body','params','headers']
export const validation=(schema)=>{
    return (req,res,next)=>{
        try{
        const validationArray=[]
        dataMethod.forEach((key)=>{
            if(schema[key]){
                const validationResult=schema[key].validate(req[key],{abortEarly:false})
                if(validationResult.error){
                    validationArray.push(validationResult.error.details)
                }else{
                    next()
                }
            }
        })
        if(validationArray.length){
            return res.status(400).json({message:"validation error",validationArray})
        }
        }catch(error){
            return res.status(500).json({message:`catch error ${error}`})
        }
    }
}