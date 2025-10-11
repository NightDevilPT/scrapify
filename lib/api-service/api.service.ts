// services/apiService.ts
import { ApiResponse } from "@/interface/api.interface";
import axios, {
	AxiosInstance,
	AxiosRequestConfig,
	AxiosResponse,
	AxiosError,
} from "axios";

class ApiService {
	private axiosInstance: AxiosInstance;

	constructor(baseURL: string = "") {
		this.axiosInstance = axios.create({
			baseURL,
			timeout: 10000,
			headers: {
				"Content-Type": "application/json",
			},
		});

		this.setupInterceptors();
	}

	private setupInterceptors(): void {
		// Request interceptor
		this.axiosInstance.interceptors.request.use(
			(config) => {
				const token = localStorage.getItem("authToken");
				if (token) {
					config.headers.Authorization = `Bearer ${token}`;
				}
				return config;
			},
			(error) => {
				return Promise.reject(this.transformError(error));
			}
		);

		// Response interceptor - modified to return AxiosResponse
		this.axiosInstance.interceptors.response.use(
			(response: AxiosResponse) => {
				// Transform the response data while maintaining AxiosResponse structure
				const transformedData = this.transformResponse(
					response.data,
					response.status
				);
				return {
					...response,
					data: transformedData,
				};
			},
			(error: AxiosError) => {
				// Transform error and reject with our ApiResponse format
				return Promise.reject(this.transformError(error));
			}
		);
	}

	private transformResponse<T>(data: any, status: number): ApiResponse<T> {
		// If the response already matches our ApiResponse structure, return as is
		if (this.isApiResponse<T>(data)) {
			return data;
		}

		// Transform different response formats to match ApiResponse<T>
		const transformedResponse: ApiResponse<T> = {
			success: status >= 200 && status < 300,
			data: data || null,
			message: "Request successful",
			error: null,
		};

		// Handle different common response formats
		if (data && typeof data === "object") {
			// If response has data property
			if ("data" in data) {
				transformedResponse.data = data.data;
			}

			// If response has message property
			if ("message" in data) {
				transformedResponse.message = data.message;
			}

			// If response has success property
			if ("success" in data) {
				transformedResponse.success = data.success;
			}

			// If response has error property
			if ("error" in data) {
				transformedResponse.error = data.error;
			}
		}

		return transformedResponse;
	}

	private transformError(error: AxiosError): ApiResponse<null> {
		// Create a standardized error response
		const errorResponse: ApiResponse<null> = {
			success: false,
			data: null,
			message: "An error occurred",
			error: error.message,
		};

		// Handle different error types
		if (error.response) {
			// Server responded with error status
			const responseData = error.response.data as any;

			errorResponse.message =
				responseData?.message ||
				`Server error: ${error.response.status}`;
			errorResponse.error = responseData?.error || error.message;

			// You can add more specific error handling based on status codes
			switch (error.response.status) {
				case 401:
					errorResponse.message = "Unauthorized access";
					break;
				case 403:
					errorResponse.message = "Forbidden";
					break;
				case 404:
					errorResponse.message = "Resource not found";
					break;
				case 500:
					errorResponse.message = "Internal server error";
					break;
				default:
					errorResponse.message = `Error: ${error.response.status}`;
			}
		} else if (error.request) {
			// Request was made but no response received
			errorResponse.message = "No response from server";
			errorResponse.error = "Network error";
		}

		return errorResponse;
	}

	private isApiResponse<T>(data: any): data is ApiResponse<T> {
		return (
			typeof data === "object" &&
			data !== null &&
			"success" in data &&
			"data" in data &&
			"message" in data
		);
	}

	// HTTP methods - fixed to handle the transformed response
	public async get<T>(
		url: string,
		config?: AxiosRequestConfig
	): Promise<ApiResponse<T>> {
		try {
			const response = await this.axiosInstance.get<ApiResponse<T>>(
				url,
				config
			);
			return response.data;
		} catch (error) {
			throw error;
		}
	}

	public async post<T>(
		url: string,
		data?: any,
		config?: AxiosRequestConfig
	): Promise<ApiResponse<T>> {
		try {
			const response = await this.axiosInstance.post<ApiResponse<T>>(
				url,
				data,
				config
			);
			return response.data;
		} catch (error) {
			throw error;
		}
	}

	public async put<T>(
		url: string,
		data?: any,
		config?: AxiosRequestConfig
	): Promise<ApiResponse<T>> {
		try {
			const response = await this.axiosInstance.put<ApiResponse<T>>(
				url,
				data,
				config
			);
			return response.data;
		} catch (error) {
			throw error;
		}
	}

	public async patch<T>(
		url: string,
		data?: any,
		config?: AxiosRequestConfig
	): Promise<ApiResponse<T>> {
		try {
			const response = await this.axiosInstance.patch<ApiResponse<T>>(
				url,
				data,
				config
			);
			return response.data;
		} catch (error) {
			throw error;
		}
	}

	public async delete<T>(
		url: string,
		config?: AxiosRequestConfig
	): Promise<ApiResponse<T>> {
		try {
			const response = await this.axiosInstance.delete<ApiResponse<T>>(
				url,
				config
			);
			return response.data;
		} catch (error) {
			throw error;
		}
	}

	// Method to update base URL
	public setBaseURL(baseURL: string): void {
		this.axiosInstance.defaults.baseURL = baseURL;
	}

	// Method to update headers
	public setHeader(key: string, value: string): void {
		this.axiosInstance.defaults.headers.common[key] = value;
	}

	// Method to remove header
	public removeHeader(key: string): void {
		delete this.axiosInstance.defaults.headers.common[key];
	}
}

// Create a default instance
const apiService = new ApiService(process.env.REACT_APP_API_BASE_URL);

export default apiService;
