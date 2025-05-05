class ApiResponse {
    constructor(stauscode , data , message = "success"){
        this.stauscode = stauscode
        this.data = data
        this.message = message
        this.success = stauscode < 400
    }
}

export {ApiResponse};