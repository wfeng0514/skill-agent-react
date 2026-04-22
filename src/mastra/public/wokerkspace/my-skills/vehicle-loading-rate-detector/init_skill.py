#!/usr/bin/env python3
"""
Skill Initializer - Creates a new skill from template

Usage:
    init_skill.py <skill-name> --path <path>

Examples:
    init_skill.py my-new-skill --path skills/public
    init_skill.py my-api-helper --path skills/private
    init_skill.py custom-skill --path /custom/location
"""

import sys
from pathlib import Path


SKILL_TEMPLATE = """---
name: {skill_name}
description: 从图片中识别车辆装载率（货车、集装箱）并计算装载百分比。使用当需要分析车辆装载情况、监控运输效率、或进行物流管理时。
---
# 车辆装载率检测器

## Overview

本技能通过图像识别技术分析车辆图片，自动计算装载率百分比，支持货车和集装箱的装载情况检测。

## 核心功能

- **图像识别**: 分析车辆图片中的装载情况
- **装载率计算**: 自动计算装载百分比
- **多车型支持**: 支持货车和集装箱
- **状态判断**: 提供装载状态评估（正常/警告/超载）

## 工作流程

### 1. 图片预处理
- 图像格式转换和标准化
- 车辆区域检测和裁剪
- 光照和对比度优化

### 2. 装载识别
- 车辆轮廓检测
- 货物区域识别
- 装载高度计算
- 空闲空间检测

### 3. 装载率计算
- 总装载容量确定
- 实际装载量计算
- 百分比转换
- 状态阈值判断

### 4. 结果输出
- 装载率数值
- 装载状态
- 可视化标记
- 建议措施

## 使用场景

- **物流管理**: 监控车辆装载效率
- **运输安全**: 防止超载运输
- **成本控制**: 优化装载空间利用
- **合规检查**: 确保符合装载标准

## 资源

### scripts/
图像处理和装载率计算的Python脚本。

### references/
图像识别方法、装载率计算标准、不同车型规格参考。

### assets/
示例图片、模板和可视化资源。
"""

EXAMPLE_SCRIPT = '''#!/usr/bin/env python3
"""
车辆装载率检测脚本

用于分析车辆图片并计算装载率百分比。
"""

import cv2
import numpy as np
from typing import Tuple, Dict, Any

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
'''

EXAMPLE_REFERENCE = """# 车辆装载率检测参考指南

## 图像识别方法

### 1. 车辆检测
- **轮廓检测**: 使用OpenCV的findContours函数
- **边缘检测**: Canny边缘检测算法
- **特征匹配**: HOG特征+SVM分类器

### 2. 装载分析
- **高度测量**: 基于像素高度的装载比例计算
- **区域分割**: 将车辆区域分为装载区和空闲区
- **颜色分析**: 货物与背景的颜色区分

### 3. 容量计算
- **标准容量**: 不同车型的标准装载容量
- **实际容量**: 基于图片测量的实际装载量
- **密度调整**: 考虑货物密度对容量的影响

## 装载率计算标准

### 货车装载率
- **轻型货车**: 载重≤2吨，装载率≤100%
- **中型货车**: 2吨<载重≤5吨，装载率≤95%
- **重型货车**: 载重>5吨，装载率≤90%

### 集装箱装载率
- **20英尺集装箱**: 标准载重21吨，装载率≤95%
- **40英尺集装箱**: 标准载重26吨，装载率≤95%
- **45英尺集装箱**: 标准载重29吨，装载率≤95%

## 状态判断标准

| 装载率 | 状态 | 颜色标识 | 建议 |
|--------|------|----------|------|
| 0-30% | 低装载 | 绿色 | 可增加装载 |
| 30-70% | 正常装载 | 蓝色 | 维持现状 |
| 70-90% | 高装载 | 黄色 | 注意重量限制 |
| 90-100% | 超载 | 红色 | 立即卸载部分货物 |

## 常见问题处理

### 1. 图片质量问题
- **模糊图片**: 使用超分辨率算法增强
- **光照不足**: 直方图均衡化处理
- **角度偏差**: 透视校正算法

### 2. 车辆识别错误
- **部分遮挡**: 多角度图片融合
- **相似车辆**: 基于特征的精确匹配
- **特殊车型**: 自适应识别算法

### 3. 装载计算误差
- **不规则货物**: 3D体积估算
- **堆叠货物**: 层次分析算法
- **空隙识别**: 空间填充算法
"""

EXAMPLE_ASSET = """# 示例图片说明

本目录包含用于测试和演示的示例图片：

## 测试图片类型

### 1. 标准装载图片
- `truck_normal_loading.jpg`: 正常装载的货车
- `container_partial_loading.jpg`: 部分装载的集装箱

### 2. 边界情况图片
- `truck_overloaded.jpg`: 超载货车
- `container_empty.jpg`: 空集装箱
- `truck_underloaded.jpg`: 低装载货车

### 3. 质量问题图片
- `blurry_truck.jpg`: 模糊的货车图片
- `dark_container.jpg`: 光照不足的集装箱
- `angled_truck.jpg`: 角度偏差的货车

## 使用方法

1. 将测试图片放在此目录
2. 运行检测脚本: `python ../scripts/detect_loading.py 图片名称`
3. 查看装载率检测结果

## 预期结果

每种图片类型应该产生不同的装载率结果：
- 正常装载: 30-70%
- 高装载: 70-90%
- 超载: >90%
- 低装载: <30%
"""

def create_skill_directory(skill_name: str, skill_path: str):
    """创建技能目录结构"""
    skill_dir = Path(skill_path) / skill_name
    skill_dir.mkdir(parents=True, exist_ok=True)
    
    # 创建子目录
    (skill_dir / "scripts").mkdir(exist_ok=True)
    (skill_dir / "references").mkdir(exist_ok=True)
    (skill_dir / "assets").mkdir(exist_ok=True)
    
    # 创建SKILL.md
    skill_md_path = skill_dir / "SKILL.md"
    skill_md_content = SKILL_TEMPLATE.format(
        skill_name=skill_name,
        skill_title=skill_name.replace("-", " ").title()
    )
    skill_md_path.write_text(skill_md_content, encoding='utf-8')
    
    # 创建示例脚本
    script_path = skill_dir / "scripts" / "detect_loading.py"
    script_content = EXAMPLE_SCRIPT.format(skill_name=skill_name)
    script_path.write_text(script_content, encoding='utf-8')
    
    # 创建参考文档
    reference_path = skill_dir / "references" / "detection_guide.md"
    reference_content = EXAMPLE_REFERENCE.format(skill_name=skill_name)
    reference_path.write_text(reference_content, encoding='utf-8')
    
    # 创建资产说明
    asset_path = skill_dir / "assets" / "README.md"
    asset_content = EXAMPLE_ASSET.format(skill_name=skill_name)
    asset_path.write_text(asset_content, encoding='utf-8')
    
    print(f"技能 '{skill_name}' 已创建在: {skill_dir}")
    print(f"包含文件:")
    print(f"  - SKILL.md")
    print(f"  - scripts/detect_loading.py")
    print(f"  - references/detection_guide.md")
    print(f"  - assets/README.md")

def main():
    if len(sys.argv) != 3:
        print("使用方法: python init_skill.py <技能名称> --path <路径>")
        print("示例: python init_skill.py vehicle-loading-rate-detector --path .")
        sys.exit(1)
    
    if sys.argv[1] != "--path":
        print("错误: 必须使用 --path 参数")
        sys.exit(1)
    
    skill_name = sys.argv[0]  # 第一个参数是脚本名称
    skill_path = sys.argv[2]
    
    create_skill_directory(skill_name, skill_path)

if __name__ == "__main__":
    main()