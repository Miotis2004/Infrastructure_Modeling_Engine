resource "aws_instance" "res_instance_web" {
  ami = "ami-0c02fb55956c7d316"
  instance_type = "t3.micro"
  subnet_id = aws_subnet.res_subnet_public.id
  vpc_security_group_ids = [aws_security_group.res_sg_web.id]
}

resource "aws_s3_bucket" "res_bucket_logs" {
  bucket = "ime-demo-logs-bucket"
  force_destroy = false
  tags = {
    Name = "ime-logs"
  }
}

resource "aws_security_group" "res_sg_web" {
  description = "Allow web traffic"
  ingress = [
    {
      cidr_blocks = [
        "0.0.0.0/0"
      ]
      from_port = 80
      protocol = "tcp"
      to_port = 80
    }
  ]
  vpc_id = aws_vpc.res_vpc_main.id
}

resource "aws_subnet" "res_subnet_public" {
  availability_zone = "us-east-1a"
  cidr_block = "10.0.1.0/24"
  tags = {
    Name = "ime-public-subnet"
  }
  vpc_id = aws_vpc.res_vpc_main.id
}

resource "aws_vpc" "res_vpc_main" {
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support = true
  tags = {
    Name = "ime-main-vpc"
  }
}
