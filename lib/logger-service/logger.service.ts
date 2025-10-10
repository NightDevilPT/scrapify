// logger.service.ts
export enum LogLevel {
	ERROR = 0,
	WARNING = 1,
	SUCCESS = 2,
	INFO = 3,
}

export interface LogConfig {
	minLevel: LogLevel; // Minimum level to log (e.g., ERROR only logs errors)
	enabled: boolean; // Enable or disable logging
}

export interface LogMessage {
	level: LogLevel;
	message: string;
	context?: string; // Optional context (e.g., module, URL)
	timestamp: string;
}

export class LoggerService {
	private static instance: LoggerService;
	private config: LogConfig = {
		minLevel: LogLevel.INFO, // Log all levels by default
		enabled: true,
	};
	private defaultContext?: string;

	private constructor() {}

	/**
	 * Gets the singleton instance of the logger.
	 */
	public static getInstance(): LoggerService {
		if (!LoggerService.instance) {
			LoggerService.instance = new LoggerService();
		}
		return LoggerService.instance;
	}

	/**
	 * Configures the logger.
	 * @param config Partial configuration to update.
	 */
	public configure(config: Partial<LogConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Sets a default context for all subsequent log messages.
	 * @param context The default context to use (e.g., module name).
	 */
	public setContext(context: string): void {
		this.defaultContext = context;
	}

	/**
	 * Clears the default context.
	 */
	public clearContext(): void {
		this.defaultContext = undefined;
	}

	/**
	 * Formats a log message with timestamp, level, and context.
	 */
	private formatMessage(
		level: LogLevel,
		message: string,
		context?: string
	): LogMessage {
		const timestamp = new Date().toISOString();
		// Use provided context, fall back to default context
		const finalContext = context || this.defaultContext;
		return { level, message, context: finalContext, timestamp };
	}

	/**
	 * Logs a message to the console with appropriate color.
	 */
	private logToConsole({
		level,
		message,
		context,
		timestamp,
	}: LogMessage): void {
		if (!this.config.enabled || level > this.config.minLevel) return;

		let prefix: string;
		let color: string;

		switch (level) {
			case LogLevel.ERROR:
				prefix = "ERROR";
				color = "\x1b[38;2;255;0;0m"; // Red (#FF0000)
				break;
			case LogLevel.WARNING:
				prefix = "WARNING";
				color = "\x1b[38;2;255;200;0m"; // Yellow (#FFC800)
				break;
			case LogLevel.SUCCESS:
				prefix = "SUCCESS";
				color = "\x1b[38;2;0;155;62m"; // Dark Green (#009b3e)
				break;
			case LogLevel.INFO:
				prefix = "INFO";
				color = "\x1b[38;2;0;102;204m"; // Blue (#0066cc)
				break;
			default:
				prefix = "UNKNOWN";
				color = "\x1b[0m"; // Reset
		}

		const contextStr = context ? ` [${context}]` : "";
		console.log(
			`${color}[${timestamp}] ${prefix}${contextStr}: ${message}\x1b[0m`
		);
	}

	/**
	 * Logs an info message.
	 * @param message The message to log.
	 * @param context Optional context (overrides default context).
	 */
	public info(message: string, context?: string): void {
		this.logToConsole(this.formatMessage(LogLevel.INFO, message, context));
	}

	/**
	 * Logs a success message.
	 * @param message The message to log.
	 * @param context Optional context (overrides default context).
	 */
	public success(message: string, context?: string): void {
		this.logToConsole(
			this.formatMessage(LogLevel.SUCCESS, message, context)
		);
	}

	/**
	 * Logs a warning message.
	 * @param message The message to log.
	 * @param context Optional context (overrides default context).
	 */
	public warning(message: string, context?: string): void {
		this.logToConsole(
			this.formatMessage(LogLevel.WARNING, message, context)
		);
	}

	/**
	 * Logs an error message.
	 * @param message The message to log.
	 * @param context Optional context (overrides default context).
	 */
	public error(message: string, context?: string): void {
		this.logToConsole(this.formatMessage(LogLevel.ERROR, message, context));
	}
}
