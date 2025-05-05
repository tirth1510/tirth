import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const ganrateAccessAndRefreshTokens = async(userId) => {
    try {

        const user = await User.findById(userId)
        const accessToken =  user.generateAccessToken()
        const refreshToken =  user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({vaildateBeforSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500 , "Error a Token to ganrate")
    }
}




export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;

  console.log(username, email, fullname, password);

  // Validate required fields
  if ([username, email, fullname, password].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user already exists
  const existedUser = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with username or email already exists");
  }

  // Handle file uploads
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverimage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  // Upload to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverimage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatar?.url) {
    throw new ApiError(400, "Failed to upload avatar to Cloudinary");
  }

  // Create user
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverimage: coverimage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Fetch user without sensitive fields
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Failed to register user");
  }

  // Send response
  return res.status(201).json(
    new ApiResponse(201, createdUser, "User registered successfully")
  );
});

export const loginUser = asyncHandler (async (req, res) => {

    const { username , email , password} = req.body;

    if (!username && !email ) {
        throw new ApiError(400 , "username or email password required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404 , "user not exist")
    }

    const passwordvaild = await user.isPasswordCorrect(password)

    if (!passwordvaild) {
        throw new ApiError(404 , "invaild cardentials")
    }

    const {accessToken , refreshToken} = await ganrateAccessAndRefreshTokens(user._id)

    const loggedHendler = await User.findById(user._id).select("-password -refreshtoken")


    const option = {
        httpOnly : true,
        secure: true
    }

    return res.status(200).cookie("accessToken", accessToken , option).cookie("refreshToken", refreshToken, option)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedHendler , accessToken , refreshToken
            },
            "User Logged In Successfully"

        )
    )
})


export const logoutUser = asyncHandler(async(req, res) => {
     
     await User.findByIdAndUpdate(
        req.user._id,
        {
             $set: {
                refreshToken : undefined
             }
        },
        {
            new : true
        }
     )

     const option = {
        httpOnly : true,
        secure: true
    }


    return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "User logged Out"))

})

export const  refreshAccessToken = asyncHandler(async (req ,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401 , "unauthoriredzed")
    }

   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
     )
 
 
     const user = await User.findById(decodedToken?._id)
 
     if (!user) {
         throw new ApiError(401 , "invaild refreshtoken")
     }
 
     if (incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401, "refreshtoken is expried")
     }
 
     const option = {
         httpOnly : true,
         secure : true
     }
 
     const {accessToken , newrefreshToken} = await ganrateAccessAndRefreshTokens(user._id)
 
     return res
     .status(200)
     .cookie("accessToken", accessToken , option)
     .cookie("refreshToken", newrefreshToken , option)
     .json(new ApiResponse(200, {accessToken , newrefreshToken}, "AccessToken refreshtoken"))
 
 
 
   } catch (error) {
        throw new ApiError(401 , error?.message || "invaild refreshtoken")
   }
     
})


