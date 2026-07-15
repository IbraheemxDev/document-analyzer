class ApiResponse<T = unknown> {
  statusCode: number;
  data: T | null;
  message: string;
  success: boolean;

  constructor(statusCode: number, data: T | null = null, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };

// usage
//   return NextResponse.json(new ApiResponse(200, data, "Fetched successfully"), {
//       status: 200,
//     });

