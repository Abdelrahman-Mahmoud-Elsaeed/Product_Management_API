resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-ecs-cluster"
  tags = { Environment = var.environment }
}

resource "aws_ecs_task_definition" "main" {
  family                   = "${var.environment}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "${var.environment}-app"
      image     = var.container_image
      essential = true
      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = var.container_port
        }
      ]

      secrets = [
        {
          name      = "SECRET_KEY"
          valueFrom = var.secret_key_arn
        },
        {
          name      = "SESSION_SECRET"
          valueFrom = var.session_secret_arn
        },
        {
          name      = "PASSWORD_SECRET_KEY"
          valueFrom = var.password_secret_key_arn
        },
        {
          name      = "DATABASE_CONNECTION"
          valueFrom = var.db_connection_arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "main" {
  name            = "${var.environment}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main.arn
  launch_type     = "FARGATE"
  desired_count   = var.desired_count

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = true # Required for free internet access without NAT Gateway
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "${var.environment}-app"
    container_port   = var.container_port
  }
}