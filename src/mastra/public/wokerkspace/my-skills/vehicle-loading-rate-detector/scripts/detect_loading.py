#!/usr/bin/env python3
"""
车辆装载率检测脚本

用于分析车辆图片并计算装载率百分比。
"""

import cv2
import numpy as np
from typing import Tuple, Dict, Any
import sys
import os

def detect_vehicle_loading(image_path: str) -> Dict[str, Any]:
    """
    检测车辆装载率
    
    Args:
        image_path: 图片文件路径
        
    Returns:
        包含装载率信息的字典
    """
    try:
        # 读取图片
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"无法读取图片: {image_path}")
        
        # 预处理图片
        processed_image = preprocess_image(image)
        
        # 检测车辆区域
        vehicle_area = detect_vehicle_area(processed_image)
        
        # 分析装载情况
        loading_info = analyze_loading(processed_image, vehicle_area)
        
        # 计算装载率
        loading_rate = calculate_loading_rate(loading_info)
        
        # 确定装载状态
        loading_status = determine_loading_status(loading_rate)
        
        return {
            "loading_rate": loading_rate,
            "loading_status": loading_status,
            "vehicle_type": loading_info.get("vehicle_type", "unknown"),
            "confidence": loading_info.get("confidence", 0.0),
            "image_info": {
                "width": image.shape[1],
                "height": image.shape[0],
                "channels": image.shape[2]
            }
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "loading_rate": 0,
            "loading_status": "error"
        }

def preprocess_image(image: np.ndarray) -> np.ndarray:
    """图片预处理"""
    # 转换为灰度图
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # 高斯模糊
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # 边缘检测
    edges = cv2.Canny(blurred, 50, 150)
    
    return edges

def detect_vehicle_area(image: np.ndarray) -> Dict[str, Any]:
    """检测车辆区域"""
    # 查找轮廓
    contours, _ = cv2.findContours(image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return {"error": "未检测到车辆轮廓"}
    
    # 找到最大的轮廓（假设是车辆）
    largest_contour = max(contours, key=cv2.contourArea)
    
    # 计算边界框
    x, y, w, h = cv2.boundingRect(largest_contour)
    
    return {
        "bbox": (x, y, w, h),
        "area": cv2.contourArea(largest_contour),
        "contour": largest_contour
    }

def analyze_loading(image: np.ndarray, vehicle_area: Dict[str, Any]) -> Dict[str, Any]:
    """分析装载情况"""
    # 这里实现具体的装载分析逻辑
    # 包括货物检测、高度计算等
    
    # 简化的装载分析
    bbox = vehicle_area["bbox"]
    x, y, w, h = bbox
    
    # 模拟装载分析结果
    loading_height = int(h * 0.7)  # 假设装载高度为车辆高度的70%
    empty_height = h - loading_height
    
    return {
        "vehicle_type": "truck",
        "loading_height": loading_height,
        "empty_height": empty_height,
        "total_height": h,
        "confidence": 0.85
    }

def calculate_loading_rate(loading_info: Dict[str, Any]) -> float:
    """计算装载率"""
    if "loading_height" in loading_info and "total_height" in loading_info:
        loading_height = loading_info["loading_height"]
        total_height = loading_info["total_height"]
        return (loading_height / total_height) * 100
    return 0.0

def determine_loading_status(loading_rate: float) -> str:
    """确定装载状态"""
    if loading_rate >= 90:
        return "超载"
    elif loading_rate >= 70:
        return "高装载"
    elif loading_rate >= 30:
        return "正常装载"
    else:
        return "低装载"

def main():
    """主函数"""
    if len(sys.argv) != 2:
        print("使用方法: python detect_loading.py <图片路径>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    result = detect_vehicle_loading(image_path)
    
    if "error" in result:
        print(f"错误: {result['error']}")
        sys.exit(1)
    
    print(f"装载率: {result['loading_rate']:.1f}%")
    print(f"装载状态: {result['loading_status']}")
    print(f"车辆类型: {result['vehicle_type']}")
    print(f"置信度: {result['confidence']:.2f}")

if __name__ == "__main__":
    main()