var material = new Array(); //产品集合

layui.config({
	base: basePath,
	version: skyeyeVersion
}).extend({ //指定js别名
	window: 'js/winui.window'
}).define(['window', 'jquery', 'winui'], function(exports) {
	winui.renderColor();
	layui.use(['form'], function(form) {
		var index = parent.layer.getFrameIndex(window.name); //获取窗口索引
		var $ = layui.$;
		var enclosureInfo = ""; //附件id
		var rowNum = 1; //表格的序号
		var depotHtml = "", materialHtml = "";//仓库
		var tockObject = new Array();//根据仓库和规格id查询出来的对应库存信息

		var usetableTemplate = $("#usetableTemplate").html();
		var selOption = getFileContent('tpl/template/select-option.tpl');
		
		initSupplierHtml();
		//初始化供应商
		function initSupplierHtml() {
			AjaxPostUtil.request({url: reqBasePath + "supplier009", params: {}, type: 'json', callback: function(json) {
				if(json.returnCode == 0) {
					//加载供应商数据
					$("#supplierId").html(getDataUseHandlebars(selOption, json)); 
					//初始化仓库
					initDepotHtml();
				} else {
					winui.window.msg(json.returnMessage, {icon: 2, time: 2000});
				}
			}});
		}
		
		//初始化仓库
		function initDepotHtml() {
			AjaxPostUtil.request({url: reqBasePath + "storehouse008", params: {}, type: 'json', callback: function(json) {
				if(json.returnCode == 0) {
					//加载仓库数据
					depotHtml = getDataUseHandlebars(selOption, json); 
					//初始化产品
					initMaterialHtml();
				} else {
					winui.window.msg(json.returnMessage, {icon: 2, time: 2000});
				}
			}});
		}
		
		//初始化产品
		function initMaterialHtml() {
			AjaxPostUtil.request({url: reqBasePath + "material010", params: {}, type: 'json', callback: function(json) {
				if(json.returnCode == 0) {
					material = json.rows;
					//加载产品数据
					materialHtml = getDataUseHandlebars(selOption, json);
					//渲染
					form.render();
					//初始化一行数据
					addRow();
				} else {
					winui.window.msg(json.returnMessage, {icon: 2, time: 2000});
				}
			}});
		}
		
		//仓库加载变化事件
		form.on('select(selectDepotProperty)', function(data) {
			var thisRowNum = data.elem.id.replace("depotId", "");//获取当前行
			var thisRowValue = data.value;
			loadTockByDepotAndMUnit(thisRowNum);
		});

		//产品加载变化事件
		form.on('select(selectMaterialProperty)', function(data) {
			var thisRowNum = data.elem.id.replace("materialId", "");//获取当前行
			var thisRowValue = data.value;
			if(!isNull(thisRowValue) && thisRowValue != '请选择') {
				$.each(material, function(i, item) {
					if(thisRowValue == item.id){
						$("#unitId" + thisRowNum).html(getDataUseHandlebars(selOption, {rows: item.unitList}));
						form.render('select');
						return false;
					}
				});
			} else {
				$("#unitId" + thisRowNum).html(""); //重置规格为空
				form.render('select');
			}
			loadTockByDepotAndMUnit(thisRowNum);
		});
		
		//产品规格加载变化事件
		form.on('select(selectUnitProperty)', function(data) {
			var thisRowNum = data.elem.id.replace("unitId", "");//获取当前行
			var thisRowValue = data.value;
			//当前选中的产品id
			var chooseMaterialId = $("#materialId" + thisRowNum).val();
			if(!isNull(thisRowValue) && thisRowValue != '请选择') {
				$.each(material, function(i, item) {
					if(chooseMaterialId == item.id){//获取产品
						$.each(item.unitList, function(j, bean) {
							if(thisRowValue == bean.id){//获取规格
								//获取当前行数量
								var rkNum = parseInt($("#rkNum" + thisRowNum).val());
								$("#unitPrice" + thisRowNum).html(bean.estimatePurchasePrice.toFixed(2));//单价
								$("#amountOfMoney" + thisRowNum).html((rkNum * parseFloat(bean.estimatePurchasePrice)).toFixed(2));//金额
								return false;
							}
						});
						return false;
					}
				});
			} else {
				$("#unitPrice" + thisRowNum).html("");//重置单价为空
				$("#amountOfMoney" + thisRowNum).html("");//重置金额为空
			}
			loadTockByDepotAndMUnit(thisRowNum);
			calculatedTotalPrice();
		});
		
		/**
		 * 根据仓库和规格加载库存
		 * @param rowNum 表格行坐标
		 */
		function loadTockByDepotAndMUnit(rowNum){
			//获取当前选中的仓库
			var chooseDepotId = $("#depotId" + rowNum).val();
			//获取当前选中的规格
			var chooseUnitId = $("#unitId" + rowNum).val();
			//当两个都不为空时
			if(!isNull(chooseDepotId) && !isNull(chooseUnitId)){
				var inTockObject = -1;
				$.each(tockObject, function(i, item){
					if(item.depotId == chooseDepotId && item.unitId == chooseUnitId){
						inTockObject = i;
						$("#currentTock" + rowNum).html(item.currentTock);
						return false;
					}
				});
				//如果数组中不包含对应的库存
				if(inTockObject < 0){
					//获取库存
					AjaxPostUtil.request({url: reqBasePath + "material011", params: {depotId: chooseDepotId, mUnitId: chooseUnitId}, type: 'json', callback: function(json) {
						if(json.returnCode == 0) {
							var currentTock = 0;
							if(!isNull(json.bean)){
								currentTock = json.bean.currentTock;
							}
							tockObject.push({
								depotId: chooseDepotId,
								unitId: chooseUnitId,
								currentTock: currentTock
							});
							$("#currentTock" + rowNum).html(currentTock);
						} else {
							winui.window.msg(json.returnMessage, {icon: 2, time: 2000});
						}
					}});
				}
			}else{
				//否则重置库存为空
				$("#currentTock" + rowNum).html("");
			}
		}
		
		//数量变化
		$("body").on("input", ".rkNum", function() {
			calculatedTotalPrice();
		});
		$("body").on("change", ".rkNum", function() {
			calculatedTotalPrice();
		});
		
		//计算总价
		function calculatedTotalPrice(){
			var rowTr = $("#useTable tr");
			var allPrice = 0;
			$.each(rowTr, function(i, item) {
				//获取行坐标
				var rowNum = $(item).attr("trcusid").replace("tr", "");
				//获取数量
				var rkNum = parseInt(isNull($("#rkNum" + rowNum).val()) ? "0" : $("#rkNum" + rowNum).val());
				//获取单价
				var unitPrice = parseFloat(isNull($("#unitPrice" + rowNum).html()) ? "0" : $("#unitPrice" + rowNum).html());
				//输出金额
				$("#amountOfMoney" + rowNum).html((rkNum * unitPrice).toFixed(2));
				allPrice += rkNum * unitPrice;
			});
			$("#allPrice").html(allPrice.toFixed(2));
		}

		form.on('submit(formAddBean)', function(data) {
			//表单验证
			if(winui.verifyForm(data.elem)) {
				//获取已选用品数据
				var rowTr = $("#useTable tr");
				if(rowTr.length == 0) {
					winui.window.msg('请选择需要领用的用品~', {icon: 2, time: 2000});
					return false;
				}
				var tableData = new Array();
				var noError = false; //循环遍历表格数据时，是否有其他错误信息
				$.each(rowTr, function(i, item) {
					var rowNum = $(item).attr("trcusid").replace("tr", "");
					var residualNum = parseInt($("#residualNum" + rowNum).html());
					if(parseInt($("#useNum" + rowNum).val()) == 0) {
						$("#useNum" + rowNum).addClass("layui-form-danger");
						$("#useNum" + rowNum).focus();
						winui.window.msg('领用数量不能为0', {icon: 2, time: 2000});
						noError = true;
						return false;
					}
					if(parseInt($("#useNum" + rowNum).val()) > residualNum) {
						$("#useNum" + rowNum).addClass("layui-form-danger");
						$("#useNum" + rowNum).focus();
						winui.window.msg('领用数量不能超过库存数量', {icon: 2, time: 2000});
						noError = true;
						return false;
					}
					if(inTableDataArrayByAssetarId($("#assetarId" + rowNum).val(), tableData)){
						winui.window.msg('领用单存在相同的用品', {icon: 2, time: 2000});
						noError = true;
						return false;
					}
					var row = {
						typeId: $("#typeId" + rowNum).val(),
						assetarId: $("#assetarId" + rowNum).val(),
						useNum: $("#useNum" + rowNum).val(),
						remark: $("#remark" + rowNum).val()
					};
					tableData.push(row);
				});
				if(noError) {
					return false;
				}

				var params = {
					title: $("#useTitle").html(),
					remark: $("#remark").val(),
					depotheadStr: JSON.stringify(tableData)
				};
//				AjaxPostUtil.request({url: reqBasePath + "assetarticles019", params: params, type: 'json', callback: function(json) {
//					if(json.returnCode == 0) {
//						parent.layer.close(index);
//						parent.refreshCode = '0';
//					} else {
//						winui.window.msg(json.returnMessage, {icon: 2, time: 2000});
//					}
//				}});
			}
			return false;
		});
		
		//判断选中的产品是否也在数组中
		function inTableDataArrayByAssetarId(str, array) {
			var isIn = false;
			$.each(array, function(i, item) {
				if(item.assetarId === str) {
					isIn = true;
					return false;
				}
			});
			return isIn;
		}

		//新增行
		$("body").on("click", "#addRow", function() {
			addRow();
		});

		//删除行
		$("body").on("click", "#deleteRow", function() {
			deleteRow();
		});

		//新增行
		function addRow() {
			var par = {
				id: "row" + rowNum.toString(), //checkbox的id
				trId: "tr" + rowNum.toString(), //行的id
				depotId: "depotId" + rowNum.toString(), //仓库id
				materialId: "materialId" + rowNum.toString(), //产品id
				unitId: "unitId" + rowNum.toString(), //规格id
				currentTock: "currentTock" + rowNum.toString(), //库存id
				rkNum: "rkNum" + rowNum.toString(), //数量id
				unitPrice: "unitPrice"  + rowNum.toString(), //单价id
				amountOfMoney: "amountOfMoney"  + rowNum.toString(), //金额id
				remark: "remark" + rowNum.toString() //备注id
			};
			$("#useTable").append(getDataUseHandlebars(usetableTemplate, par));
			//赋值给仓库
			$("#" + "depotId" + rowNum.toString()).html(depotHtml);
			//赋值给产品
			$("#" + "materialId" + rowNum.toString()).html(materialHtml);
			form.render('select');
			form.render('checkbox');
			rowNum++;
		}

		//删除行
		function deleteRow() {
			var checkRow = $("#useTable input[type='checkbox'][name='tableCheckRow']:checked");
			if(checkRow.length > 0) {
				$.each(checkRow, function(i, item) {
					$(item).parent().parent().remove();
				});
			} else {
				winui.window.msg('请选择要删除的行', {icon: 2, time: 2000});
			}
		}

		//根据仓库和商品重置库存
		function resetAssetList(thisRowNum, list) {
			var sHtml = getDataUseHandlebars(selOption, {
				rows: list
			});
			$("#assetarId" + thisRowNum).html(sHtml); //重置商品列表下拉框
			$("#specificationsName" + thisRowNum).html(""); //重置规格为空
			$("#residualNum" + thisRowNum).html(""); //重置库存为空
			form.render('select');
		}

		//判断是否在数组中
		function inPointArray(str, array) {
			var isIn = false;
			$.each(array, function(i, item) {
				if(item.id === str) {
					isIn = true;
					return false;
				}
			});
			return isIn;
		}

		//获取指定key对应的集合
		function getListPointArray(str, array) {
			var isList = [];
			$.each(array, function(i, item) {
				if(item.id === str) {
					$.extend(true, isList, item.list);
					return false;
				}
			});
			return isList;
		}

		//获取在数组集合中的下标
		function getIndexPointArray(str, array) {
			var isIndex = -1;
			$.each(array, function(i, item) {
				if(item.id === str) {
					isIndex = i;
					return false;
				}
			});
			return isIndex;
		}

		$("body").on("click", "#cancle", function() {
			parent.layer.close(index);
		});
	});
});