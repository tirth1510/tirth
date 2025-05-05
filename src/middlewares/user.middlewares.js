import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";


export const verifyJWt = asyncHandler(async(req, res, next) => {

   try {
    const token = req.cookies?.accessToken || req.header("Auththorization")?.replace("Bearer","")
    //const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    if (!token) {
     throw new ApiError(401 , "Unauththorization")
    }
 
    const decoded =  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
 
    const user = await User.findById(decoded?._id).select(" -password -refreshtoken")
 
    if (!user) {
     throw new ApiError(401 , "invaild token access")
    }
 
    req.user = user;
    next()
   } catch (error) {
      throw new ApiError(401 , error?.message || "Invaild user accesstoken ")
   }

})