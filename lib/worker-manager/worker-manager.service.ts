// lib/worker-manager/parallel-task-manager.ts
import {
	ParallelManagerOptions,
	TaskResult,
} from "@/interface/worker-manager.interface";
import os from "os";
import { EventEmitter } from "events";

export class ParallelTaskManager extends EventEmitter {
	private maxConcurrent: number;
	private taskTimeout: number;
	private retryAttempts: number;
	private retryDelay: number;
	private activeCount = 0;
	private taskQueue: Array<() => Promise<void>> = [];
	private results: any[] = [];

	constructor(options: ParallelManagerOptions = {}) {
		super();
		this.maxConcurrent = options.maxConcurrent || os.cpus().length;
		this.taskTimeout = options.taskTimeout || 30000;
		this.retryAttempts = options.retryAttempts || 2;
		this.retryDelay = options.retryDelay || 1000;
	}

	/**
	 * Execute a single task with timeout and retry logic
	 */
	private async executeWithTimeout<T, R>(
		executor: (data: T) => Promise<R>,
		data: T,
		attempt: number = 1
	): Promise<TaskResult<R>> {
		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				resolve({
					success: false,
					error: `Task timed out after ${this.taskTimeout}ms`,
					attempts: attempt,
				});
			}, this.taskTimeout);

			executor(data)
				.then((result) => {
					clearTimeout(timeout);
					resolve({
						success: true,
						data: result,
						attempts: attempt,
					});
				})
				.catch(async (error) => {
					clearTimeout(timeout);

					// Retry logic
					if (attempt < this.retryAttempts) {
						console.log(
							`⚠️  Retry attempt ${attempt + 1}/${
								this.retryAttempts
							}`
						);
						await new Promise((r) =>
							setTimeout(r, this.retryDelay)
						);
						const retryResult = await this.executeWithTimeout(
							executor,
							data,
							attempt + 1
						);
						resolve(retryResult);
					} else {
						resolve({
							success: false,
							error: error.message || "Task failed",
							attempts: attempt,
						});
					}
				});
		});
	}

	/**
	 * Process next task in queue
	 */
	private async processNext(): Promise<void> {
		if (
			this.taskQueue.length === 0 ||
			this.activeCount >= this.maxConcurrent
		) {
			return;
		}

		const task = this.taskQueue.shift();
		if (task) {
			this.activeCount++;
			await task();
			this.activeCount--;
			this.processNext(); // Process next task
		}
	}

	/**
	 * Run tasks in parallel with controlled concurrency
	 */
	public async runParallel<T, R>(
		items: T[],
		executor: (data: T) => Promise<R>,
		onProgress?: (
			completed: number,
			total: number,
			result?: TaskResult<R>
		) => void
	): Promise<R[]> {
		return new Promise((resolve, reject) => {
			const results: R[] = [];
			let completed = 0;
			const total = items.length;

			if (total === 0) {
				resolve([]);
				return;
			}

			console.log(
				`\n🚀 Starting parallel execution: ${total} tasks with ${this.maxConcurrent} concurrent workers\n`
			);

			items.forEach((item, index) => {
				const task = async () => {
					try {
						const result = await this.executeWithTimeout(
							executor,
							item
						);

						if (result.success && result.data !== undefined) {
							results[index] = result.data;
						}

						completed++;

						if (onProgress) {
							onProgress(completed, total, result);
						}

						// Check if all tasks are complete
						if (completed === total) {
							resolve(results);
						}
					} catch (error) {
						completed++;
						console.error(`❌ Task ${index} failed:`, error);

						if (completed === total) {
							resolve(results);
						}
					}
				};

				this.taskQueue.push(task);
			});

			// Start processing
			for (
				let i = 0;
				i < Math.min(this.maxConcurrent, this.taskQueue.length);
				i++
			) {
				this.processNext();
			}
		});
	}

	/**
	 * Run tasks in batches
	 */
	public async runInBatches<T, R>(
		items: T[],
		batchSize: number,
		executor: (data: T) => Promise<R>,
		onBatchComplete?: (batchNumber: number, totalBatches: number) => void
	): Promise<R[]> {
		const results: R[] = [];
		const totalBatches = Math.ceil(items.length / batchSize);

		console.log(
			`\n📦 Processing ${items.length} items in ${totalBatches} batches of ${batchSize}\n`
		);

		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);
			const batchNumber = Math.floor(i / batchSize) + 1;

			console.log(`🔄 Processing batch ${batchNumber}/${totalBatches}`);

			const batchResults = await this.runParallel(
				batch,
				executor,
				(completed, total) => {
					process.stdout.write(
						`\r   Progress: ${completed}/${total} tasks completed    `
					);
				}
			);

			results.push(...batchResults);
			console.log(`\n✅ Batch ${batchNumber} completed\n`);

			if (onBatchComplete) {
				onBatchComplete(batchNumber, totalBatches);
			}

			// Small delay between batches
			if (i + batchSize < items.length) {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		}

		return results;
	}

	/**
	 * Get current statistics
	 */
	public getStats() {
		return {
			maxConcurrent: this.maxConcurrent,
			activeCount: this.activeCount,
			queuedTasks: this.taskQueue.length,
		};
	}

	/**
	 * Update concurrency limit
	 */
	public setMaxConcurrent(value: number): void {
		this.maxConcurrent = Math.max(1, value);
		console.log(
			`⚙️  Max concurrent tasks updated to: ${this.maxConcurrent}`
		);
	}
}

// Export a simple factory function
export function createParallelManager(
	options?: ParallelManagerOptions
): ParallelTaskManager {
	return new ParallelTaskManager(options);
}
