output "alb_security_group_id" {
  value = aws_security_group.alb.id
}

output "eks_nodes_security_group_id" {
  value = aws_security_group.eks_nodes.id
}
