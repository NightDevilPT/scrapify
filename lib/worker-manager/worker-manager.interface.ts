export interface TaskConfig<T = any, R = any> {
	taskData: T;
	executor: (data: T) => Promise<R>;
}

export interface ParallelManagerOptions {
	maxConcurrent?: number;
	taskTimeout?: number;
	retryAttempts?: number;
	retryDelay?: number;
}

export interface TaskResult<R = any> {
	success: boolean;
	data?: R;
	error?: string;
	attempts?: number;
}
