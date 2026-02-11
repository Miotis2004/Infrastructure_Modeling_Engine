output "out_bucket_arn" {
  value = aws_s3_bucket.res_bucket_logs.arn
  description = "ARN of the logs bucket"
}

output "out_instance_id" {
  value = aws_instance.res_instance_web.id
  description = "ID of the web instance"
}
