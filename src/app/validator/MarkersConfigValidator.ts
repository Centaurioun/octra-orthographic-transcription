import { ConfigValidator, ValidationResult } from "../shared/ConfigValidator";
import { isNullOrUndefined } from "util";
import { isArray } from "util";

export class MarkersConfigValidator extends ConfigValidator {

	private version: string = "1.0.3";

	public validate(key: string, value: any): ValidationResult {
		let prefix: string = "MarkersConfig Validation - ";

		switch (key) {
			case("name"):
				if (typeof value === "string") break;
				return {
					success: false,
					error  : prefix + "value of key '" + key + "' must be of type string"
				};
			case("version"):
				if (typeof value === "string") break;
				return {
					success: false,
					error  : prefix + "value of key '" + key + "' must be of type string"
				};
			case("items")   :
				if (isArray(value)) {
					for (let i = 0; i < value.length; i++) {
						let elem = value[ i ];

						if (isNullOrUndefined(elem.name) || typeof elem.name !== "string") {
							return {
								success: false,
								error  : prefix + "value of key items[" + i + "].name must be of type string"
							};
						}
						if (isNullOrUndefined(elem.code) || typeof elem.code !== "string") {
							return {
								success: false,
								error  : prefix + "value of key items[" + i + "].code must be of type string"
							};
						}
						if (isNullOrUndefined(elem.icon_url) || typeof elem.icon_url !== "string") {
							return {
								success: false,
								error  : prefix + "value of key items[" + i + "].code must be of type string"
							};
						}
						if (isNullOrUndefined(elem.button_text) || typeof elem.button_text !== "string") {
							return {
								success: false,
								error  : prefix + "value of key items[" + i + "].code must be of type string"
							};
						}

						if(isArray(elem.description)) {
							for (let j = 0; j < elem.description.length; j++) {
								if (isNullOrUndefined(elem.description[ j ].language) || typeof elem.description[ j ].language !== "string") {
									return {
										success: false,
										error  : prefix + "value of key items[" + i + "][" + j + "].language must be of type string"
									};
								}
								if (isNullOrUndefined(elem.description[ j ].translation) || typeof elem.description[ j ].translation !== "string") {
									return {
										success: false,
										error  : prefix + "value of key items[" + i + "][" + j + "].translation must be of type string"
									};
								}
							}
						} else{
							return {
								success: false,
								error  : prefix + "value of key description must be of type array"
							};
						}

						if (isNullOrUndefined(elem.shortcut) || typeof elem.shortcut !== "object") {
							return {
								success: false,
								error  : prefix + "value of key items[" + i + "].shortcut must be of type object {'mac':string, 'pc':string}"
							};
						}

						if (isNullOrUndefined(elem.shortcut) || typeof elem.shortcut !== "object") {
							return {
								success: false,
								error  : prefix + "value of key items[" + i + "].shortcut must be of type object {'mac':string, 'pc':string}"
							};
						} else{
							if (isNullOrUndefined(elem.shortcut.mac) || typeof elem.shortcut.mac !== "string") {
								return {
									success: false,
									error  : prefix + "value of key items[" + i + "].shortcut.mac must be of type string"
								};
							}
							if (isNullOrUndefined(elem.shortcut.pc) || typeof elem.shortcut.pc !== "string") {
								return {
									success: false,
									error  : prefix + "value of key items[" + i + "].shortcut.pc must be of type string"
								};
							}
						}
					}
				}
				else {
					return {
						success: false,
						error  : prefix + "value of key '" + key + "' must be of type array"
					};
				}
				break;
			default:
				return {
					success: false,
					error  : prefix + "key '" + key + "' not found"
				};
		}

		return {
			success: true,
			error  : ""
		};
	}
}